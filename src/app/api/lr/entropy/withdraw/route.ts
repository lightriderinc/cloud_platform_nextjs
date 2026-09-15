import { resolveCustomerFromRequest } from "@/lib/auth/resolveCustomer";
import { db } from "@/lib/billing/db";
import { hasEnoughCredits, hasPurchasedCredits } from "@/lib/billing/planCheck";
import { DEFAULT_ENTROPY_BACKEND_ID, proxyEntropyWithdrawPost } from "@/lib/entropy/proxy";
import { entropyCostCents } from "@/lib/entropy/pricing";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/lr/entropy/withdraw?backend_id= — instant withdrawal from one or
 * more chiplet pools. qpu-proxy doesn't check or deduct credits (same as
 * reservations/submit) -- that's this route's job: pre-check against a
 * requested-bits estimate, forward to qpu-proxy, and only charge -- using the
 * CONFIRMED bits actually withdrawn (sum of chiplets[].bits), never the
 * pre-check estimate -- once the withdrawal has actually succeeded.
 */
export async function POST(req: NextRequest) {
  const customer = await resolveCustomerFromRequest(req, { createIfMissing: true });
  if (!customer) {
    return NextResponse.json(
      { error: "Not signed in, and no valid API key provided." },
      { status: 401 },
    );
  }

  const body = await req.json();
  const { chiplet_ids, bits_per_chiplet } = body;

  // The only entropy backend is real Rigetti hardware (see
  // DEFAULT_ENTROPY_BACKEND_ID) -- there's no free mock variant, so every
  // withdrawal is gated the same way other real-hardware paths are.
  if (!(await hasPurchasedCredits(customer.id))) {
    return NextResponse.json(
      {
        error: "purchase_required",
        message:
          "Entropy withdrawal requires purchasing credits first. Visit /settings/purchases/quantum-compute to buy credits.",
      },
      { status: 402 },
    );
  }

  const requestedChiplets = Array.isArray(chiplet_ids) ? chiplet_ids.length : 0;
  const estimatedBits = requestedChiplets * (Number(bits_per_chiplet) || 0);
  const estimatedCostCents = entropyCostCents(estimatedBits);

  if (estimatedCostCents > 0 && !hasEnoughCredits(customer, estimatedCostCents)) {
    return NextResponse.json(
      {
        error: "insufficient_credits",
        message: `This withdrawal costs ~${estimatedCostCents.toLocaleString()} credits (~$${(estimatedCostCents / 100).toFixed(2)}), but your account has ${customer.creditsBalanceCents.toLocaleString()} credits ($${(customer.creditsBalanceCents / 100).toFixed(2)}) remaining.`,
      },
      { status: 402 },
    );
  }

  const proxyRes = await proxyEntropyWithdrawPost(req, body);
  if (!proxyRes.ok) {
    return proxyRes;
  }

  const data = await proxyRes.json();

  // Nothing was withdrawn from any chiplet -- no charge, same "only charge
  // on real success" rule quantum/submit and reservations follow.
  if (data.insufficient) {
    return NextResponse.json(data, { status: proxyRes.status });
  }

  // combined_stream is an XOR of these same withdrawn bits, not additional
  // entropy pulled from the pool -- never counted again here.
  const actualBits: number = Array.isArray(data.chiplets)
    ? data.chiplets.reduce((sum: number, c: { bits?: number }) => sum + (c.bits ?? 0), 0)
    : 0;
  const costCents = entropyCostCents(actualBits);

  if (costCents > 0) {
    await db.$transaction([
      db.customer.update({
        where: { id: customer.id },
        data: { creditsBalanceCents: { decrement: costCents } },
      }),
      db.creditLedgerEntry.create({
        data: {
          customerId: customer.id,
          amountCents: -costCents,
          reason: `entropy_withdraw:${data.backend_id ?? DEFAULT_ENTROPY_BACKEND_ID}`,
        },
      }),
    ]);
  }

  return NextResponse.json({ ...data, cost_cents: costCents }, { status: proxyRes.status });
}
