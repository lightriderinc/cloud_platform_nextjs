import { Customer } from "@prisma/client";
import { db } from "@/lib/billing/db";

/**
 * Customer has no `tier` field — Pro status isn't stored on Customer at all.
 * The browser-session gate (/api/lr/[...path]/route.ts) checks the Logto
 * "Pro" role via getAccessTier(), but that relies on a Logto session cookie
 * that doesn't exist for API-key-authenticated SDK requests. So for this
 * request path, Pro status is resolved the same way /api/onboarding/status
 * already does: an active/trialing Subscription row, here further scoped to
 * the User Pricing "pro" tier specifically.
 */
export async function isProCustomer(customer: Customer): Promise<boolean> {
  const proSubscription = await db.subscription.findFirst({
    where: {
      customerId: customer.id,
      kind: "USER_PLAN",
      tier: "pro",
      status: { in: ["active", "trialing"] },
    },
  });
  return !!proSubscription;
}

export function hasEnoughCredits(customer: Customer, costCents: number): boolean {
  return customer.creditsBalanceCents >= costCents;
}

/**
 * Whether this customer's credits are unlocked for real-hardware use (QPU
 * jobs, reservations, entropy withdrawal).
 *
 * The one-time signup grant (customer.ts: SIGNUP_CREDIT_CENTS) does NOT
 * unlock anything on its own — that is the whole point of the grant being
 * "locked" until the account proves itself. Anything else that put real
 * credits on the account does unlock it:
 *   - a purchase (checkout, or plan credits from a subscription), or
 *   - credits received from another customer via Share Credits.
 *
 * Receiving a transfer counts deliberately: those are real credits somebody
 * already paid for, and the recipient can spend, send and receive them
 * normally — treating their account as un-proven made the lock arbitrary.
 * The trade-off is accepted and explicit: being sent any amount, however
 * small, unlocks the recipient's own signup grant for real hardware too.
 *
 * Expressed as "any positive ledger row that isn't the signup grant", which
 * covers both cases without enumerating reason prefixes. Checked against the
 * ledger rather than creditsBalanceCents so a customer who has since spent
 * back down to zero stays unlocked — this gates access, not balance.
 *
 * Renamed from hasPurchasedCredits(): a purchase is no longer the only way
 * to satisfy it, and a name that still said "purchased" would misdescribe
 * the check at every call site.
 */
export async function hasUnlockedCredits(customerId: string): Promise<boolean> {
  const result = await db.creditLedgerEntry.aggregate({
    where: {
      customerId,
      amountCents: { gt: 0 },
      reason: { not: "signup_credit" },
    },
    _sum: { amountCents: true },
  });
  return (result._sum.amountCents ?? 0) > 0;
}
