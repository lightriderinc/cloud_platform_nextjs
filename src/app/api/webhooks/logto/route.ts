import { processBackchannelLogoutToken } from "@/lib/logto/backchannel-logout";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Logto's OIDC back-channel logout webhook (OpenID Connect Back-Channel
 * Logout 1.0 — Logto's discovery doc advertises `backchannel_logout_supported`).
 * Register this exact URL as the app's Back-Channel Logout URI in the Logto
 * Console for this app (Settings -> Advanced). See RevokedLogtoSession in
 * prisma/schema.prisma for why this exists: signing out of another app ends
 * the shared Logto session, but doesn't touch this app's own already-issued
 * tokens — this webhook is what tells us the shared session actually ended.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const logoutToken = form?.get("logout_token");

  if (typeof logoutToken !== "string" || !logoutToken) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Missing logout_token." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await processBackchannelLogoutToken(logoutToken);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[logto-backchannel-logout] rejected logout token:", detail);
    return NextResponse.json(
      { error: "invalid_request", error_description: detail },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  return new NextResponse(null, { status: 200, headers: { "Cache-Control": "no-store" } });
}
