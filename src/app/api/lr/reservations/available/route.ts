import { resolveCustomerFromRequest } from "@/lib/auth/resolveCustomer";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PLACEHOLDER: see RESERVATION_MARKUP_MULTIPLIER in .env.example — pricing
// moves to per-second billing later and this flat multiplier will change.
const RESERVATION_MARKUP_MULTIPLIER = Number(process.env.RESERVATION_MARKUP_MULTIPLIER ?? "1.25");

// Verified live against qpu-proxy (2026-08-18): GET /reservations/available
// always returns exactly 10 slots per call — a fixed COUNT, not a time
// window (2.5h of coverage at 15m, 5h at 30m, 10h at 60m) — and
// start_time_from pages forward cleanly (confirmed: start_time_from=<T>
// returns slots starting exactly at T). Because the batch size is a fixed,
// predictable count, the start_time_from for every batch across a range can
// be computed upfront — there's no need to discover each cursor from the
// previous batch's last slot, so all batches fire in parallel instead of a
// sequential chain (that sequential chain was what made first load slow).
const SLOTS_PER_BATCH = 10;
const MAX_UPSTREAM_CALLS = 30; // a 3-day 15m range needs ~29 batches (72h / 2.5h per batch)
const FAN_OUT_CONCURRENCY = 8; // cap on simultaneous upstream calls, so a big range doesn't hammer qpu-proxy in one burst

interface RawSlot {
  start_time: string;
  end_time: string;
  price: number;
}

interface AvailableSlotOut {
  startTime: string;
  endTime: string;
  priceCents: number;
  creditsPrice: number;
}

// Process-local cache, same idiom as the Prisma singleton in lib/billing/db.ts
// — not shared across horizontally-scaled instances, but availability
// doesn't change second-to-second and this is what makes a burst of
// upstream calls per page load tolerable under repeated renders/re-mounts.
// Keyed by the exact request shape; entries just expire in place on next
// read, no separate cleanup timer.
const CACHE_TTL_MS = 45_000;
const availabilityCache = new Map<string, { available: AvailableSlotOut[]; expiresAt: number }>();

async function fetchAvailabilityPage(
  deviceInstance: string,
  duration: string,
  startTimeFrom: string,
): Promise<RawSlot[]> {
  const proxyParams = new URLSearchParams({
    device_instance: deviceInstance,
    duration,
    start_time_from: startTimeFrom,
  });
  const proxyRes = await fetch(
    `${process.env.QUANTUM_PROXY_URL}/reservations/available?${proxyParams}`,
    { headers: { Authorization: `Bearer ${process.env.QUANTUM_PROXY_SERVICE_KEY}` } },
  );
  if (!proxyRes.ok) {
    throw new Error(`qpu-proxy availability check failed: HTTP ${proxyRes.status}`);
  }
  const data = await proxyRes.json();
  return data.available ?? [];
}

/** Runs `fn` over `items` with at most `limit` in flight at once, preserving each result's index. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * GET /api/lr/reservations/available
 *
 * Fans out to qpu-proxy's fixed-10-slots-per-call availability endpoint —
 * in parallel, batch start times computed upfront from the fixed batch size
 * — to cover [start_time_from, range_end), merging the results into one
 * response. The customer-facing (marked-up) credit price is added
 * server-side, same as before. `range_end` is purely an internal contract
 * between this route and its caller (the slot picker); qpu-proxy never sees
 * it. Omitting `range_end` falls back to a single upstream call (today's
 * original behavior), for any future caller that just wants "the next
 * batch" rather than a bounded range.
 *
 * Requires a resolved customer (same auth as /api/lr/quantum/*) even though
 * the data itself isn't customer-scoped, so this isn't an open,
 * unauthenticated view into Rigetti's real schedule/pricing.
 */
export async function GET(req: NextRequest) {
  const customer = await resolveCustomerFromRequest(req);
  if (!customer) {
    return NextResponse.json(
      { error: "Not signed in, and no valid API key provided." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const deviceInstance = searchParams.get("device_instance");
  const durationParam = searchParams.get("duration");
  const startTimeFrom = searchParams.get("start_time_from") ?? new Date().toISOString();
  const rangeEnd = searchParams.get("range_end");

  if (!deviceInstance || !durationParam) {
    return NextResponse.json(
      { error: "device_instance and duration are required." },
      { status: 400 },
    );
  }

  // qpu-proxy/QCS requires a Go-style duration string ("15m"/"30m"/"60m") for
  // this param — NOT a bare number and NOT an ISO 8601 duration ("PT15M";
  // that exact wrong format already cost a debugging cycle on the backend
  // once before). Our own contract with the client (ReservationDuration, in
  // lib/quantum/reservations.ts) stays a plain number of minutes — this is
  // the one place it's converted, right before the call it's actually for.
  const durationMinutes = Number(durationParam);
  const duration = `${durationParam}m`;

  const cacheKey = `${deviceInstance}|${duration}|${startTimeFrom}|${rangeEnd ?? ""}`;
  const cached = availabilityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ available: cached.available });
  }

  // One batch covers SLOTS_PER_BATCH slots of `durationMinutes` each — the
  // stride differs per duration (2.5h at 15m, 5h at 30m, 10h at 60m), so
  // it's computed from the actual duration rather than hardcoded.
  const strideMs = SLOTS_PER_BATCH * durationMinutes * 60_000;
  const startMs = new Date(startTimeFrom).getTime();
  const endBoundary = rangeEnd ? new Date(rangeEnd).getTime() : null;

  const batchStarts: string[] = [];
  if (endBoundary === null) {
    // No explicit range requested — this is the "just give me the next
    // batch" caller, so one call is the whole answer.
    batchStarts.push(startTimeFrom);
  } else {
    for (let t = startMs; t < endBoundary && batchStarts.length < MAX_UPSTREAM_CALLS; t += strideMs) {
      batchStarts.push(new Date(t).toISOString());
    }
  }

  const results = await mapWithConcurrency(batchStarts, FAN_OUT_CONCURRENCY, (cursor) =>
    fetchAvailabilityPage(deviceInstance, duration, cursor).catch((err) => {
      console.error("qpu-proxy unreachable for batch starting at", cursor, err);
      return null;
    }),
  );

  // A batch can legitimately come back empty (that stretch of time is fully
  // booked) — that's not a failure. A failure is `null` (the upstream call
  // itself errored). All-null means every batch failed, which reads as a
  // real outage rather than "everything's booked" and should surface as one.
  if (results.every((r) => r === null)) {
    return NextResponse.json(
      { error: "Reservation availability is currently unreachable. Try again later." },
      { status: 502 },
    );
  }

  const merged: RawSlot[] = [];
  const seenStarts = new Set<string>();
  for (const page of results) {
    for (const slot of page ?? []) {
      if (!seenStarts.has(slot.start_time)) {
        seenStarts.add(slot.start_time);
        merged.push(slot);
      }
    }
  }

  const available: AvailableSlotOut[] = merged.map((slot) => ({
    startTime: slot.start_time,
    endTime: slot.end_time,
    priceCents: slot.price,
    creditsPrice: Math.round(slot.price * RESERVATION_MARKUP_MULTIPLIER),
  }));

  availabilityCache.set(cacheKey, { available, expiresAt: Date.now() + CACHE_TTL_MS });

  return NextResponse.json({ available });
}
