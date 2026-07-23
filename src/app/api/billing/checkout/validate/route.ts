import { requireLogtoUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { stripe } from "@/lib/stripe/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/billing/checkout/validate
 *
 * Creates a Stripe Checkout Session for the fixed validation-test price, used
 * to exercise the Stripe -> webhook -> Logto role-assignment pipeline
 * end-to-end without touching the real pricing tiers.
 */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_VALIDATION_TEST;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_PRICE_VALIDATION_TEST is not configured." },
      { status: 500 },
    );
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);

  const origin = request.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { logtoUserId: user.sub, kind: "validation" },
    },
    metadata: { logtoUserId: user.sub, kind: "validation" },
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/billing?checkout=canceled`,
  });

  return NextResponse.json({ url: session.url });
}
