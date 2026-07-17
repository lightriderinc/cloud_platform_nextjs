import { requireLogtoUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { stripe } from "@/lib/stripe/client";
import { NextRequest, NextResponse } from "next/server";

const MIN_TOPUP_USD = 5;
const MAX_TOPUP_USD = 10_000;

/**
 * POST /api/billing/checkout/credits
 * Body: { amountUsd: number }
 *
 * Quantum Compute Pricing is a prepaid wallet, not a fixed SKU, so this uses
 * Stripe's `price_data` (a price created inline for the session) rather than
 * a pre-created Price ID like the subscription flows use.
 */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const amountUsd = Number(body?.amountUsd);

  if (!Number.isFinite(amountUsd) || amountUsd < MIN_TOPUP_USD || amountUsd > MAX_TOPUP_USD) {
    return NextResponse.json(
      { error: `amountUsd must be between $${MIN_TOPUP_USD} and $${MAX_TOPUP_USD}.` },
      { status: 400 },
    );
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);
  const origin = request.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Light Rider quantum compute credits" },
          unit_amount: Math.round(amountUsd * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { logtoUserId: user.sub, kind: "credits" },
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/pricing/quantum-compute?checkout=canceled`,
  });

  return NextResponse.json({ url: session.url });
}
