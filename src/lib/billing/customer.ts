import { db } from "@/lib/billing/db";
import { stripe } from "@/lib/stripe/client";
import type { Customer } from "@prisma/client";
import Stripe from "stripe";

// 10 Light Rider tokens ($1/token), granted once per new customer, no
// payment required — V2 product model.
const SIGNUP_CREDIT_CENTS = 1000;

/**
 * Returns the Customer row for a signed-in Logto user, creating both a
 * Stripe Customer and our local mapping row on first use — and granting a
 * one-time free credit balance in the same DB transaction, so "became a
 * customer" and "has their free credits" are the same atomic event.
 * logtoUserId's uniqueness means this can only ever happen once per person.
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

  return db.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        logtoUserId,
        email,
        stripeCustomerId: stripeCustomer.id,
        creditsBalanceCents: SIGNUP_CREDIT_CENTS,
      },
    });

    await tx.creditLedgerEntry.create({
      data: {
        customerId: customer.id,
        amountCents: SIGNUP_CREDIT_CENTS,
        reason: "signup_credit",
      },
    });

    return customer;
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

/**
 * Creates a Stripe Checkout Session for a Customer, recovering once from a
 * stale `stripeCustomerId` — e.g. the Stripe customer was deleted directly
 * in the Dashboard (routine in test mode) while our DB row still points at
 * it, so every subsequent checkout attempt fails with "No such customer"
 * until someone notices. On that specific error, mint a fresh Stripe
 * customer, persist it, and retry exactly once; any other error — or a
 * second failure — propagates as a real error rather than looping.
 */
export async function createCheckoutSession(
  customer: Customer,
  params: Omit<Stripe.Checkout.SessionCreateParams, "customer">,
): Promise<Stripe.Checkout.Session> {
  try {
    return await stripe.checkout.sessions.create({
      ...params,
      customer: customer.stripeCustomerId,
    });
  } catch (err) {
    if (!isStaleCustomerError(err)) {
      throw err;
    }

    console.warn(
      `[stripe] stripeCustomerId ${customer.stripeCustomerId} for customer ${customer.id} no longer exists in Stripe; minting a replacement.`,
    );

    const fresh = await stripe.customers.create({
      email: customer.email ?? undefined,
      metadata: { logtoUserId: customer.logtoUserId },
    });
    await db.customer.update({
      where: { id: customer.id },
      data: { stripeCustomerId: fresh.id },
    });

    return stripe.checkout.sessions.create({ ...params, customer: fresh.id });
  }
}

function isStaleCustomerError(err: unknown): boolean {
  return (
    err instanceof Stripe.errors.StripeInvalidRequestError &&
    err.code === "resource_missing" &&
    err.param === "customer" &&
    typeof err.message === "string" &&
    err.message.includes("No such customer")
  );
}
