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
 * Real QPU access requires having bought credits at least once — the
 * one-time signup grant (see customer.ts: SIGNUP_CREDIT_CENTS) doesn't
 * count, even though it's still spendable dollar-for-dollar once a customer
 * has purchased something. Checked against the ledger directly (not
 * creditsBalanceCents) so a customer who has since spent their purchase back
 * down to $0 still counts as "has purchased" — this gates access, not
 * balance.
 */
export async function hasPurchasedCredits(customerId: string): Promise<boolean> {
  const result = await db.creditLedgerEntry.aggregate({
    where: { customerId, amountCents: { gt: 0 }, reason: { not: "signup_credit" } },
    _sum: { amountCents: true },
  });
  return (result._sum.amountCents ?? 0) > 0;
}
