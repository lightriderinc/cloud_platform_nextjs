import { requireLogtoUser } from "@/lib/auth/session";
import { db } from "@/lib/billing/db";
import { stripe } from "@/lib/stripe/client";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

type MaskedPaymentMethod =
  | { type: "card"; brand: string; last4: string; expMonth: number; expYear: number }
  | { type: "link"; email: string | null };

// Stripe's card fields are already pre-masked (brand/last4/expiry only), and
// Link never exposes the underlying card at all — this just picks out what's
// safe to show, per payment method type. Customers who save a card via
// Stripe Link at checkout get a "link" PaymentMethod, not a "card" one, so
// both need handling or they'd look like they have nothing on file.
function maskPaymentMethod(pm: Stripe.PaymentMethod): MaskedPaymentMethod | null {
  if (pm.type === "card" && pm.card) {
    return {
      type: "card",
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
    };
  }
  if (pm.type === "link") {
    return { type: "link", email: pm.link?.email ?? null };
  }
  return null;
}

/**
 * GET /api/billing/payment-method
 *
 * Returns the caller's own default (or most recently attached) payment
 * method, masked.
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
    return NextResponse.json({ paymentMethod: null });
  }

  const stripeCustomer = await stripe.customers.retrieve(
    customer.stripeCustomerId,
    { expand: ["invoice_settings.default_payment_method"] },
  );

  if (stripeCustomer.deleted) {
    return NextResponse.json({ paymentMethod: null });
  }

  const defaultPaymentMethod =
    stripeCustomer.invoice_settings.default_payment_method;

  if (defaultPaymentMethod && typeof defaultPaymentMethod !== "string") {
    const masked = maskPaymentMethod(defaultPaymentMethod);
    if (masked) {
      return NextResponse.json({ paymentMethod: masked });
    }
  }

  // No usable default — fall back to the most recently attached payment
  // method of a type we know how to display. Cards first (most common),
  // then Link.
  for (const type of ["card", "link"] as const) {
    const { data } = await stripe.paymentMethods.list({
      customer: customer.stripeCustomerId,
      type,
      limit: 1,
    });
    const masked = data[0] ? maskPaymentMethod(data[0]) : null;
    if (masked) {
      return NextResponse.json({ paymentMethod: masked });
    }
  }

  return NextResponse.json({ paymentMethod: null });
}
