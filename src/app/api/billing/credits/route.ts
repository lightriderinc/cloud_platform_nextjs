import { requireLogtoUser } from "@/lib/auth/session";
import { db } from "@/lib/billing/db";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { TRANSFER_RECEIVED_PREFIX } from "@/lib/billing/transferCredits";
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
 *
 * `hasUnlocked` is the one signal every gate and banner should read: whether
 * this account's credits are usable on real hardware. It mirrors
 * hasUnlockedCredits() in planCheck.ts, which is what the server actually
 * enforces — derived here once so no component re-implements the rule and
 * drifts from it.
 *
 * `purchasedCents` and `receivedTransferCents` are kept for DISPLAY only
 * (they answer "how did this account get its credits"), and neither should
 * be used to gate anything.
 */
export async function GET() {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);

  const [purchased, used, receivedTransfers] = await Promise.all([
    db.creditLedgerEntry.aggregate({
      where: {
        customerId: customer.id,
        amountCents: { gt: 0 },
        reason: { not: "signup_credit" },
        // Received transfers are spendable but were never purchased — this
        // field reports genuine purchases only. Unlocking is `hasUnlocked`.
        NOT: { reason: { startsWith: TRANSFER_RECEIVED_PREFIX } },
      },
      _sum: { amountCents: true },
    }),
    db.creditLedgerEntry.aggregate({
      where: { customerId: customer.id, amountCents: { lt: 0 } },
      _sum: { amountCents: true },
    }),
    // Credits received from other customers. Counted separately from
    // purchases so the UI can still tell the two apart.
    db.creditLedgerEntry.aggregate({
      where: {
        customerId: customer.id,
        reason: { startsWith: TRANSFER_RECEIVED_PREFIX },
      },
      _sum: { amountCents: true },
    }),
  ]);

  const purchasedCents = purchased._sum.amountCents ?? 0;
  const usedCents = Math.abs(used._sum.amountCents ?? 0);
  const receivedTransferCents = receivedTransfers._sum.amountCents ?? 0;

  return NextResponse.json({
    purchasedCents,
    usedCents,
    remainingCents: customer.creditsBalanceCents,
    receivedTransferCents,
    // Same predicate as hasUnlockedCredits(): a purchase OR a received
    // transfer. The signup grant alone never satisfies it.
    hasUnlocked: purchasedCents > 0 || receivedTransferCents > 0,
  });
}
