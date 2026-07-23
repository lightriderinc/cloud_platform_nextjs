import { requireLogtoUser } from "@/lib/auth/session";
import { getOwnedSubscription } from "@/lib/billing/ownership";
import { stripe } from "@/lib/stripe/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/billing/subscription/reactivate
 * Body: { subscriptionId }
 *
 * Undoes a pending cancel-at-period-end. Returns 404 whether the
 * subscription doesn't exist or just isn't the caller's — the response
 * must not reveal which.
 */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const subscriptionId = body?.subscriptionId as string | undefined;
  if (!subscriptionId) {
    return NextResponse.json(
      { error: "Request must include `subscriptionId`." },
      { status: 400 },
    );
  }

  const subscription = await getOwnedSubscription(user.sub, subscriptionId);
  if (!subscription) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  return NextResponse.json({ ok: true });
}
