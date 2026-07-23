import { requireLogtoUser } from "@/lib/auth/session";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { API_PLANS, USER_PLANS, resolvePriceId } from "@/lib/billing/plans";
import { stripe } from "@/lib/stripe/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/billing/checkout/subscription
 * Body: { kind: "user_plan" | "api_plan", tier: string }
 *
 * Creates a Stripe Checkout Session in subscription mode and returns the
 * redirect URL. The client should navigate to `url` (full page redirect;
 * Stripe Checkout is a hosted page, not embeddable via fetch).
 */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const kind = body?.kind as "user_plan" | "api_plan" | undefined;
  const tier = body?.tier as string | undefined;

  if (!kind || !tier) {
    return NextResponse.json(
      { error: "Request must include `kind` and `tier`." },
      { status: 400 },
    );
  }

  const planTable = kind === "user_plan" ? USER_PLANS : API_PLANS;
  const plan = (planTable as Record<string, { priceEnvVar: string }>)[tier];
  if (!plan) {
    return NextResponse.json(
      { error: `Unknown tier "${tier}" for ${kind}.` },
      { status: 400 },
    );
  }

  let priceId: string;
  try {
    priceId = resolvePriceId(plan.priceEnvVar);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);

  const origin = request.nextUrl.origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customer.stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { logtoUserId: user.sub, kind },
    },
    metadata: { logtoUserId: user.sub, kind },
    success_url: `${origin}/billing?checkout=success`,
    cancel_url: `${origin}/pricing/${kind === "user_plan" ? "user-plans" : "api"}?checkout=canceled`,
  });

  return NextResponse.json({ url: session.url });
}
