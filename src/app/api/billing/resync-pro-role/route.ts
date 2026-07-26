import { requireLogtoUser } from "@/lib/auth/session";
import { db } from "@/lib/billing/db";
import { isProCustomer } from "@/lib/billing/planCheck";
import { assignRoleToUser } from "@/lib/logto/management";
import { withRetries } from "@/lib/retry";
import { NextResponse } from "next/server";

/**
 * POST /api/billing/resync-pro-role
 *
 * Self-service re-sync for when the Stripe webhook's Logto role grant
 * silently failed (transient error, retries exhausted, and Stripe's own
 * retry window since lapsed). Session-gated — only ever re-syncs the
 * caller's own account, using the same DB subscription check
 * (isProCustomer) the rest of the app already trusts as the source of truth.
 * No admin secret, can't touch anyone else's account.
 */
export async function POST() {
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
    return NextResponse.json({ error: "No billing account found." }, { status: 404 });
  }

  if (!(await isProCustomer(customer))) {
    return NextResponse.json(
      { error: "No active Pro subscription found for your account." },
      { status: 403 },
    );
  }

  const roleId = process.env.LOGTO_PRO_ROLE_ID;
  if (!roleId) {
    return NextResponse.json(
      { error: "LOGTO_PRO_ROLE_ID is not configured on the server." },
      { status: 500 },
    );
  }

  try {
    await withRetries(() => assignRoleToUser(customer.logtoUserId, roleId));
  } catch (err) {
    console.error(
      `[resync-pro-role] failed to assign Logto role ${roleId} to ${customer.logtoUserId} after retries:`,
      err,
    );
    return NextResponse.json(
      { error: "Failed to sync Pro role. Try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, message: "Pro role synced." });
}
