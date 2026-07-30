import { requireLogtoUser } from "@/lib/auth/session";
import { getUserAccountFacts } from "@/lib/logto/management";
import { NextResponse } from "next/server";

/**
 * GET /api/account/password-status
 *
 * Returns whether the caller has a password credential set. Social/SSO-only
 * users (who signed up through a connector) have none, which the
 * SetPasswordGateModal uses to prompt them to set one before continuing.
 *
 * Reads via the Management API (`getUserAccountFacts`) rather than the end-user
 * Account API, since the latter only exposes `hasPassword` when the Logto
 * Account Center config opts in.
 */
export async function GET() {
  let user;
  try {
    user = await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const { hasPassword } = await getUserAccountFacts(user.sub);
    // Fail open: only report `false` when we're sure, so a transient lookup
    // issue never traps a user behind the set-password gate.
    return NextResponse.json({ hasPassword: hasPassword ?? true });
  } catch (err) {
    console.error("[account] password-status lookup failed:", err);
    return NextResponse.json({ hasPassword: true });
  }
}
