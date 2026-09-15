import { getSession } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
// Auth state is per-request and must never be cached or shared between users.
export const dynamic = "force-dynamic";

/**
 * Current auth state for the client-side session sync (see
 * @/components/auth/SessionSync). Returns nothing but a boolean: it carries no
 * PII, and anything the UI needs to *display* comes from the server render
 * that `router.refresh()` triggers once this reports a change.
 *
 * MUST use the very same `getSession()` the UI renders from. An earlier
 * version used a cheaper cookie-only check to avoid a userinfo round-trip per
 * poll, and the two disagreed exactly when it mattered: after a session was
 * revoked, the cookie still decoded fine, so this endpoint reported "signed
 * in" while every component rendered "signed out". The sync then saw no change
 * to act on AND applied the signed-in policy (no silent check on focus), which
 * silently broke cross-app sign-in propagation. Consistency here is worth far
 * more than the saved request.
 */
export async function GET() {
  const { isAuthenticated } = await getSession();

  return NextResponse.json(
    { isAuthenticated },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}
