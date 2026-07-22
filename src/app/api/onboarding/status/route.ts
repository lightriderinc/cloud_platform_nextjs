import { requireLogtoUser } from "@/lib/auth/session";
import { db } from "@/lib/billing/db";
import { NextResponse } from "next/server";

/**
 * GET /api/onboarding/status
 *
 * Returns whether the caller has already taken the first billing step
 * (an active/trialing subscription, or a positive credit balance), for the
 * Dashboard's "Getting started" checklist.
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
    return NextResponse.json({ hasPlanOrCredits: false });
  }

  const activeSubscription = await db.subscription.findFirst({
    where: {
      customerId: customer.id,
      status: { in: ["active", "trialing"] },
    },
  });

  return NextResponse.json({
    hasPlanOrCredits: !!activeSubscription || customer.creditsBalanceCents > 0,
  });
}
