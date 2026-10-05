import { NextResponse } from "next/server";
import { chargeEntropyDraw } from "@/lib/billing/entropyCharges";
import { readJson, withEntropyCustomer } from "@/lib/billing/entropyInternal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/internal/entropy/charge  (entropy platform server only)
 * Body: { drawId: uuid, mode: "pool"|"custom"|"source"|"card", bytes: number, email?: string }
 *
 * Debits ceil(bytes/256) credits (min 1) BEFORE the draw. Idempotent per
 * drawId. 402 with error "insufficient_credits" or "credits_locked" means
 * nothing was charged and the egress must not be called.
 */
export async function POST(request: Request) {
  const body = await readJson(request);
  const email = typeof body.email === "string" ? body.email : undefined;
  return withEntropyCustomer(request, { create: true, email }, async (customer) => {
    const r = await chargeEntropyDraw(customer, {
      drawId: String(body.drawId ?? ""),
      mode: String(body.mode ?? ""),
      bytes: Number(body.bytes),
    });
    switch (r.status) {
      case "charged":
        return NextResponse.json(r);
      case "insufficient_balance":
        return NextResponse.json(
          { error: "insufficient_credits", amountCents: r.amountCents, balanceCents: r.balanceCents },
          { status: 402 },
        );
      case "locked":
        return NextResponse.json(
          { error: "credits_locked", amountCents: r.amountCents, balanceCents: r.balanceCents },
          { status: 402 },
        );
      case "invalid":
        return NextResponse.json({ error: "invalid", message: r.message }, { status: 400 });
      case "conflict":
        return NextResponse.json({ error: "conflict", message: r.message }, { status: 409 });
    }
  });
}
