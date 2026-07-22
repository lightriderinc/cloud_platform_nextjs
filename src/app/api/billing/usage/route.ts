import { requireLogtoUser } from "@/lib/auth/session";
import { db } from "@/lib/billing/db";
import { findApiPlanByPriceId } from "@/lib/billing/plans";
import { NextResponse } from "next/server";

/**
 * GET /api/billing/usage
 *
 * Returns the caller's own API Pricing usage against their active plan's
 * included call allowance for the current billing period.
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
    return NextResponse.json({ plan: null });
  }

  const subscription = await db.subscription.findFirst({
    where: {
      customerId: customer.id,
      kind: "API_PLAN",
      status: { in: ["active", "trialing"] },
    },
  });
  if (!subscription) {
    return NextResponse.json({ plan: null });
  }

  const plan = findApiPlanByPriceId(subscription.stripePriceId);
  if (!plan) {
    return NextResponse.json({ plan: null });
  }

  const usage = await db.apiUsageEvent.aggregate({
    where: {
      customerId: customer.id,
      ...(subscription.currentPeriodStart
        ? { createdAt: { gte: subscription.currentPeriodStart } }
        : {}),
    },
    _sum: { quantity: true },
  });

  const includedCalls = plan.callsIncluded;
  const usedCalls = usage._sum.quantity ?? 0;

  return NextResponse.json({
    plan: { tier: plan.tier, name: plan.name },
    includedCalls,
    usedCalls,
    remainingCalls: includedCalls - usedCalls,
    currentPeriodEnd: subscription.currentPeriodEnd,
  });
}
