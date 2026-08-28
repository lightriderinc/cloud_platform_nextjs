import { requireLogtoUser } from "@/lib/auth/session";
import { resolveCustomerFromRequest } from "@/lib/auth/resolveCustomer";
import { hasEnoughCredits, hasPurchasedCredits } from "@/lib/billing/planCheck";
import { db } from "@/lib/billing/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PLACEHOLDER: see RESERVATION_MARKUP_MULTIPLIER in .env.example — pricing
// moves to per-second billing later and this flat multiplier will change.
const RESERVATION_MARKUP_MULTIPLIER = Number(process.env.RESERVATION_MARKUP_MULTIPLIER ?? "1.25");

/**
 * POST /api/lr/reservations
 *
 * Books a paid, exclusive-access Rigetti reservation. qpu-proxy does not
 * check or deduct credits — that's entirely this route's job, following the
 * same order quantum/submit/route.ts already uses: pre-check balance against
 * the quoted price (before calling qpu-proxy), call qpu-proxy, and only
 * deduct — using the CONFIRMED price_cents from its response, never the
 * pre-check quote — once the booking has actually succeeded.
 */
export async function POST(req: Request) {
  const customer = await resolveCustomerFromRequest(req, { createIfMissing: true });
  if (!customer) {
    return NextResponse.json(
      { error: "Not signed in, and no valid API key provided." },
      { status: 401 },
    );
  }

  const body = await req.json();
  const { device_instance, start_time, end_time, notes, quoted_price_cents } = body;

  if (!device_instance || !start_time || !end_time) {
    return NextResponse.json(
      { error: "device_instance, start_time, and end_time are required." },
      { status: 400 },
    );
  }

  // Same gate as real-hardware job submission (submit/route.ts): the free
  // signup grant alone doesn't unlock real QPU access, reservations included.
  if (!(await hasPurchasedCredits(customer.id))) {
    return NextResponse.json(
      {
        error: "purchase_required",
        message:
          "Booking a reservation requires purchasing credits first. Visit /settings/purchases/quantum-compute to buy credits.",
      },
      { status: 402 },
    );
  }

  // Pre-check against the quoted price shown in the slot picker, purely to
  // avoid an unnecessary qpu-proxy call for an obviously-insufficient
  // balance. The actual charge below always uses qpu-proxy's CONFIRMED
  // price_cents, never this estimate — a real mismatch just means the
  // balance can go negative rather than the booking being rolled back
  // (same known limitation job submission already has, not solved here).
  if (typeof quoted_price_cents === "number") {
    const estimatedCredits = Math.round(quoted_price_cents * RESERVATION_MARKUP_MULTIPLIER);
    if (!hasEnoughCredits(customer, estimatedCredits)) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message: `This reservation costs ~${estimatedCredits.toLocaleString()} credits (~$${(estimatedCredits / 100).toLocaleString()}), but your account has ${customer.creditsBalanceCents.toLocaleString()} credits ($${(customer.creditsBalanceCents / 100).toLocaleString()}) remaining.`,
        },
        { status: 402 },
      );
    }
  }

  const proxyRes = await fetch(`${process.env.QUANTUM_PROXY_URL}/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.QUANTUM_PROXY_SERVICE_KEY}`,
    },
    body: JSON.stringify({ device_instance, start_time, end_time, notes }),
  }).catch((err) => {
    console.error("qpu-proxy unreachable:", err);
    return null;
  });

  if (!proxyRes) {
    return NextResponse.json(
      { error: "Reservation booking service is currently unreachable. Try again later." },
      { status: 502 },
    );
  }

  if (!proxyRes.ok) {
    const errBody: Record<string, unknown> = await proxyRes.json().catch(() => ({}));
    const errorType = errBody.error_type;

    if (errorType === "ReservationSlotUnavailableError") {
      return NextResponse.json(
        {
          error: "slot_unavailable",
          message: "That slot was just booked by someone else. Pick another time.",
        },
        { status: 409 },
      );
    }

    if (errorType === "ReservationPaymentRequiredError") {
      // Our own Rigetti account is out of funds — NOT a customer problem.
      // Logged for internal alerting; the customer only ever sees a generic
      // "temporarily unavailable" message under a distinct error code so the
      // UI can never confuse this with the customer's own insufficient
      // credits.
      console.error(
        "[reservations] Rigetti account out of funds (ReservationPaymentRequiredError) — operational issue, not a customer credits problem:",
        errBody,
      );
      return NextResponse.json(
        {
          error: "reservation_unavailable",
          message: "Booking is temporarily unavailable. Please try again later.",
        },
        { status: 503 },
      );
    }

    // ReservationForbiddenError, ReservationValidationError, or anything unrecognized.
    return NextResponse.json(
      {
        error: "booking_failed",
        message: typeof errBody.error === "string" ? errBody.error : "Failed to book reservation.",
      },
      { status: proxyRes.status },
    );
  }

  const data = await proxyRes.json();
  const chargedCredits = Math.round(data.price_cents * RESERVATION_MARKUP_MULTIPLIER);

  await db.$transaction([
    db.reservation.create({
      data: {
        customerId: customer.id,
        reservationId: String(data.reservation_id),
        qcsReservationId: String(data.qcs_reservation_id),
        deviceInstance: data.device_instance,
        startTime: new Date(data.start_time),
        endTime: new Date(data.end_time),
        priceCents: data.price_cents,
        markupMultiplier: RESERVATION_MARKUP_MULTIPLIER,
        chargedCredits,
        notes: notes ?? null,
      },
    }),
    db.customer.update({
      where: { id: customer.id },
      data: { creditsBalanceCents: { decrement: chargedCredits } },
    }),
    db.creditLedgerEntry.create({
      data: {
        customerId: customer.id,
        amountCents: -chargedCredits,
        reason: `reservation:${data.reservation_id}`,
      },
    }),
  ]);

  return NextResponse.json({
    reservationId: String(data.reservation_id),
    qcsReservationId: String(data.qcs_reservation_id),
    deviceInstance: data.device_instance,
    startTime: data.start_time,
    endTime: data.end_time,
    priceCents: data.price_cents,
    chargedCredits,
    notes: notes ?? null,
    status: data.status,
  });
}

/**
 * GET /api/lr/reservations
 *
 * Lists the caller's own reservations from our local table — never from
 * qpu-proxy directly. qpu-proxy only ever sees the one shared
 * QUANTUM_PROXY_SERVICE_KEY, so it can't scope "current user" to actual
 * Light Rider customers (see the Reservation model comment in
 * schema.prisma); this table is the real source of truth for "my
 * reservations".
 */
export async function GET(req: Request) {
  const customer = await resolveCustomerFromRequest(req);
  if (!customer) {
    // Same distinction quantum/jobs/route.ts makes: a signed-in user simply
    // has no reservations yet (empty list) vs. a truly unauthenticated
    // caller (401) — the Reservation row is only ever created on booking.
    const signedIn = await requireLogtoUser().then(
      () => true,
      () => false,
    );
    if (signedIn) return NextResponse.json({ reservations: [] });

    return NextResponse.json(
      { error: "Not signed in, and no valid API key provided." },
      { status: 401 },
    );
  }

  const reservations = await db.reservation.findMany({
    where: { customerId: customer.id },
    orderBy: { startTime: "desc" },
  });

  return NextResponse.json({
    reservations: reservations.map((r) => ({
      reservationId: r.reservationId,
      qcsReservationId: r.qcsReservationId,
      deviceInstance: r.deviceInstance,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime.toISOString(),
      priceCents: r.priceCents,
      chargedCredits: r.chargedCredits,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
