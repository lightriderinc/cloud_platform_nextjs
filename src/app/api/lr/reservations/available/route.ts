import { resolveCustomerFromRequest } from "@/lib/auth/resolveCustomer";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PLACEHOLDER: see RESERVATION_MARKUP_MULTIPLIER in .env.example — pricing
// moves to per-second billing later and this flat multiplier will change.
const RESERVATION_MARKUP_MULTIPLIER = Number(process.env.RESERVATION_MARKUP_MULTIPLIER ?? "1.25");

// Verified live against qpu-proxy (2026-08-18): GET /reservations/available
// always returns exactly 10 slots per call — a fixed COUNT, not a time
// window (2.5 hours of coverage at 15m, 10 hours at 60m). start_time_from
// pages forward cleanly (confirmed: start_time_from=<T> returns slots
// starting exactly at T). So covering a multi-day grid requires repeatedly
// advancing start_time_from past the last returned slot until the requested
// range is covered — a single call was never meant to answer "give me a
// whole day".
const MAX_UPSTREAM_CALLS = 30; // a 3-day 15m range needs ~29 calls (72h / 2.5h per batch)

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
// doesn't change second-to-second and this is what makes ~29 upstream calls
// per page load tolerable under repeated renders/re-mounts. Keyed by the
// exact request shape; entries just expire in place on next read, no
// separate cleanup timer.
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

/**
 * GET /api/lr/reservations/available
 *
 * Fans out to qpu-proxy's fixed-10-slots-per-call availability endpoint as
 * many times as needed to cover [start_time_from, range_end), merging the
 * results into one response — the customer-facing (marked-up) credit price
 * is added server-side, same as before. `range_end` is purely an internal
 * contract between this route and its caller (the slot picker); qpu-proxy
 * never sees it. Omitting `range_end` falls back to a single upstream call
 * (today's original behavior), for any future caller that just wants "the
 * next batch" rather than a bounded range.
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
  const duration = `${durationParam}m`;

  const cacheKey = `${deviceInstance}|${duration}|${startTimeFrom}|${rangeEnd ?? ""}`;
  const cached = availabilityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ available: cached.available });
  }

  const endBoundary = rangeEnd ? new Date(rangeEnd).getTime() : null;
  const merged: RawSlot[] = [];
  const seenStarts = new Set<string>();
  let cursor = startTimeFrom;

  for (let call = 0; call < MAX_UPSTREAM_CALLS; call++) {
    let page: RawSlot[];
    try {
      page = await fetchAvailabilityPage(deviceInstance, duration, cursor);
    } catch (err) {
      console.error("qpu-proxy unreachable:", err);
      // A failure on the very first call is a real outage — surface it as
      // one, rather than a silent empty list that reads as "fully booked".
      // A failure partway through a fan-out degrades gracefully instead:
      // return whatever's already been merged rather than failing the whole
      // request for a transient blip.
      if (merged.length === 0) {
        return NextResponse.json(
          { error: "Reservation availability is currently unreachable. Try again later." },
          { status: 502 },
        );
      }
      break;
    }

    if (page.length === 0) break;

    for (const slot of page) {
      if (!seenStarts.has(slot.start_time)) {
        seenStarts.add(slot.start_time);
        merged.push(slot);
      }
    }

    // No explicit range requested — this is the "just give me the next
    // batch" caller, so one call is the whole answer.
    if (endBoundary === null) break;

    const lastSlot = page[page.length - 1];
    if (new Date(lastSlot.end_time).getTime() >= endBoundary) break;

    const nextCursor = lastSlot.end_time;
    // The actual runaway condition isn't "too many calls" — it's the cursor
    // not moving forward (e.g. a backend quirk repeating the same batch).
    // Catch that directly rather than relying solely on MAX_UPSTREAM_CALLS.
    if (new Date(nextCursor).getTime() <= new Date(cursor).getTime()) break;
    cursor = nextCursor;
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
