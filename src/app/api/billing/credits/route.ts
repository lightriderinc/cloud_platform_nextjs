import { requireLogtoUser } from "@/lib/auth/session";
import { db } from "@/lib/billing/db";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { NextResponse } from "next/server";

/**
 * GET /api/billing/credits
 *
 * Returns the caller's own Quantum Compute credit balance, split into
 * what's actually been purchased vs. spent so far. `purchasedCents`
 * deliberately excludes the one-time free signup grant (reason:
 * "signup_credit") — it's a real-purchases-only signal, used both to gate
 * real QPU access (see /api/lr/quantum/submit) and to decide whether the
 * purchased-credits UI (CreditsSummary, UsageSummary, LowCreditsBanner)
 * should show at all.
 */
export async function GET() {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);

  const [purchased, used] = await Promise.all([
    db.creditLedgerEntry.aggregate({
      where: {
        customerId: customer.id,
        amountCents: { gt: 0 },
        reason: { not: "signup_credit" },
      },
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
