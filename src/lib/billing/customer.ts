import { db } from "@/lib/billing/db";
import { stripe } from "@/lib/stripe/client";

/**
 * Returns the Customer row for a signed-in Logto user, creating both a
 * Stripe Customer and our local mapping row on first use.
 *
 * `logtoUserId` must be `claims.sub` from `getLogtoContext` — never trust a
 * client-supplied id here, always resolve it server-side.
 */
export async function getOrCreateCustomer(logtoUserId: string, email?: string) {
  const existing = await db.customer.findUnique({ where: { logtoUserId } });
  if (existing) return existing;

  const stripeCustomer = await stripe.customers.create({
    email,
    metadata: { logtoUserId },
  });

  return db.customer.create({
    data: {
      logtoUserId,
      email,
      stripeCustomerId: stripeCustomer.id,
    },
  });
}

/** Sum of the credit ledger for a customer, in cents. */
export async function getCreditBalanceCents(customerId: string): Promise<number> {
  const result = await db.creditLedgerEntry.aggregate({
    where: { customerId },
    _sum: { amountCents: true },
  });
  return result._sum.amountCents ?? 0;
}
