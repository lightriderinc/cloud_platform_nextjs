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
