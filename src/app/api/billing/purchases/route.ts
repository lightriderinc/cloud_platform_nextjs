import { requireLogtoUser } from "@/lib/auth/session";
import { db } from "@/lib/billing/db";
import { getOrCreateCustomer } from "@/lib/billing/customer";
import { NextResponse } from "next/server";

/**
 * GET /api/billing/purchases
 *
 * Returns the caller's own compute-token purchase history: real top-ups
 * only (one-time checkouts and plan credits), excluding the free
 * `signup_credit` grant and job-spend debits — same purchased-credits
 * definition as /api/billing/credits's `purchasedCents`.
 */
export async function GET() {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const customer = await getOrCreateCustomer(user.sub, user.email);

  const entries = await db.creditLedgerEntry.findMany({
    where: {
      customerId: customer.id,
      amountCents: { gt: 0 },
      reason: { not: "signup_credit" },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    purchases: entries.map((entry) => ({
      id: entry.id,
      amountCents: entry.amountCents,
      type: entry.reason.startsWith("plan_credit:") ? "plan_credit" : "one_time",
      createdAt: entry.createdAt.toISOString(),
    })),
  });
}
