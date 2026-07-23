import { db } from "@/lib/billing/db";

/**
 * Looks up a Subscription by id and returns it only if it belongs to
 * `logtoUserId`, otherwise null. This is the access-control check for every
 * subscription-mutating route — callers must never act on a subscription
 * without going through this first.
 */
export async function getOwnedSubscription(
  logtoUserId: string,
  subscriptionId: string,
) {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { customer: true },
  });

  if (!subscription || subscription.customer.logtoUserId !== logtoUserId) {
    return null;
  }

  return subscription;
}
