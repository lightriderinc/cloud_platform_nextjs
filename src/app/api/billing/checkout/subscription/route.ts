import { requireLogtoUser } from "@/lib/auth/session";
import { createCheckoutSession, getOrCreateCustomer } from "@/lib/billing/customer";
import { API_PLANS, USER_PLANS, resolvePriceId } from "@/lib/billing/plans";
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

  // V2 product model: Pro (User Pricing) checkout is disabled — hiding the
  // "Choose Pro" button alone doesn't stop a direct request to this shared
  // route, so it's blocked here too. api_plan (EaaS) checkout is a separate,
  // unaffected product and must keep working.
  if (kind === "user_plan" && tier === "pro") {
    return NextResponse.json(
      { error: "Pro plan checkout is not currently available." },
      { status: 403 },
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
  const session = await createCheckoutSession(customer, {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { logtoUserId: user.sub, kind },
    },
    metadata: { logtoUserId: user.sub, kind },
    success_url: `${origin}/settings/usage?checkout=success`,
    cancel_url: `${origin}/settings/purchases/${kind === "user_plan" ? "user-plans" : "api"}?checkout=canceled`,
  });

  return NextResponse.json({ url: session.url });
}
