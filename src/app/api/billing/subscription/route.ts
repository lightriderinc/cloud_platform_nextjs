import { requireLogtoUser } from "@/lib/auth/session";
import { db } from "@/lib/billing/db";
import { NextResponse } from "next/server";

/**
 * GET /api/billing/subscription
 *
 * Returns the caller's own subscriptions. Never accepts a subscription id as
 * input — the caller's Logto session is the only key, so there's nothing to
 * leak to a request for someone else's data.
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
    include: { subscriptions: true },
  });

  return NextResponse.json({ subscriptions: customer?.subscriptions ?? [] });
}
