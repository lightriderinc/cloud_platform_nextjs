import { requireLogtoUser } from "@/lib/auth/session";
import { db } from "@/lib/billing/db";
import { NextResponse } from "next/server";

/**
 * GET /api/billing/credits
 *
 * Returns the caller's own Quantum Compute credit balance, split into
 * what's been purchased/granted vs. spent so far.
 */
export async function GET() {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const customer = await db.customer.findUnique({
    where: { logtoUserId: user.sub },
  });
  if (!customer) {
    return NextResponse.json({
      purchasedCents: 0,
      usedCents: 0,
      remainingCents: 0,
    });
  }

  const [purchased, used] = await Promise.all([
    db.creditLedgerEntry.aggregate({
      where: { customerId: customer.id, amountCents: { gt: 0 } },
      _sum: { amountCents: true },
    }),
    db.creditLedgerEntry.aggregate({
      where: { customerId: customer.id, amountCents: { lt: 0 } },
      _sum: { amountCents: true },
    }),
  ]);

  const purchasedCents = purchased._sum.amountCents ?? 0;
  const usedCents = Math.abs(used._sum.amountCents ?? 0);

  return NextResponse.json({
    purchasedCents,
    usedCents,
    remainingCents: customer.creditsBalanceCents,
  });
}
