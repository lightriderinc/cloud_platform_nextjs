import { resolveCustomerFromRequest } from "@/lib/auth/resolveCustomer";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PLACEHOLDER: see RESERVATION_MARKUP_MULTIPLIER in .env.example — pricing
// moves to per-second billing later and this flat multiplier will change.
const RESERVATION_MARKUP_MULTIPLIER = Number(process.env.RESERVATION_MARKUP_MULTIPLIER ?? "1.25");

/**
 * GET /api/lr/reservations/available
 *
 * Passthrough to qpu-proxy's own availability check, with the customer-
 * facing (marked-up) credit price added server-side — the client never sees
 * RESERVATION_MARKUP_MULTIPLIER or does markup math itself. Requires a
 * resolved customer (same auth as /api/lr/quantum/*) even though the data
 * itself isn't customer-scoped, so this isn't an open, unauthenticated view
 * into Rigetti's real schedule/pricing.
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
  const duration = searchParams.get("duration");
  const startTimeFrom = searchParams.get("start_time_from");

  if (!deviceInstance || !duration) {
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
  const proxyParams = new URLSearchParams({
    device_instance: deviceInstance,
    duration: `${duration}m`,
  });
  if (startTimeFrom) proxyParams.set("start_time_from", startTimeFrom);

  const proxyRes = await fetch(
    `${process.env.QUANTUM_PROXY_URL}/reservations/available?${proxyParams}`,
    { headers: { Authorization: `Bearer ${process.env.QUANTUM_PROXY_SERVICE_KEY}` } },
  ).catch((err) => {
    console.error("qpu-proxy unreachable:", err);
    return null;
  });

  if (!proxyRes || !proxyRes.ok) {
    return NextResponse.json(
      { error: "Reservation availability is currently unreachable. Try again later." },
      { status: 502 },
    );
  }

  const data = await proxyRes.json();
  const available = (data.available ?? []).map(
    (slot: { start_time: string; end_time: string; price: number }) => ({
      startTime: slot.start_time,
      endTime: slot.end_time,
      priceCents: slot.price,
      creditsPrice: Math.round(slot.price * RESERVATION_MARKUP_MULTIPLIER),
    }),
  );

  return NextResponse.json({ available });
}
