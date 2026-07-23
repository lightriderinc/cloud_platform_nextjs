import { requireLogtoUser } from "@/lib/auth/session";
import { db } from "@/lib/billing/db";
import { stripe } from "@/lib/stripe/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/billing/portal
 * Returns a redirect URL into the Stripe-hosted Customer Portal, where users
 * can update payment methods, view invoices, or cancel a plan themselves.
 *
 * Requires the Customer Portal to be configured once in the Stripe
 * Dashboard (Settings -> Billing -> Customer portal) before this works.
 */
export async function POST(request: NextRequest) {
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
    return NextResponse.json(
      { error: "No billing account yet — subscribe to a plan first." },
      { status: 404 },
    );
  }

  const origin = request.nextUrl.origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripeCustomerId,
    return_url: `${origin}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
