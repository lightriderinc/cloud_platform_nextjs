import { logtoConfig } from "@/app/logto";
import {
  CONSENT_RETRY_PARAM,
  SERVER_COOLDOWN_SECONDS,
  consentRetryCookieName,
  sanitizeReturnTo,
  silentSsoCookieName,
} from "@/lib/auth/silent-sso";
import { Prompt } from "@logto/node";
import { signIn } from "@logto/next/server-actions";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Starts an OIDC `prompt=none` check against Logto: "is the shared session
 * still alive?" Logto answers by redirecting to /callback with either a code
 * or `error=login_required`; neither ever shows the user a login screen.
 *
 * Guard 2 of the loop protection lives here (see @/lib/auth/silent-sso for the
 * full policy): while the cooldown cookie is present this route bounces the
 * visitor straight back without contacting Logto at all, so no client — buggy,
 * hand-crafted, or malicious — can spin up a redirect loop through it.
 */
export async function GET(request: NextRequest) {
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const cookieStore = await cookies();

  // The one follow-up allowed after Logto answered `consent_required`. Only
  // honoured when the callback actually set the retry cookie, so the flag
  // cannot be used from outside that flow to skip the cooldown at will.
  const isConsentRetry =
    request.nextUrl.searchParams.get(CONSENT_RETRY_PARAM) === "1" &&
    Boolean(cookieStore.get(consentRetryCookieName(logtoConfig.appId)));

  // The consent retry deliberately bypasses this: the silent probe that just
  // ran set the cooldown moments ago, and honouring it here would strand the
  // user signed-out despite Logto having told us a session exists. It has its
  // own single-shot guard (CONSENT_RETRY_COOKIE) instead.
  if (!isConsentRetry && cookieStore.get(silentSsoCookieName(logtoConfig.appId))) {
    return NextResponse.redirect(new URL(returnTo, request.nextUrl.origin));
  }

  // Set the cooldown BEFORE redirecting out, so an abandoned or failed
  // round-trip still counts as an attempt and cannot be retried immediately.
  //
  // Short on purpose. This is the backstop that breaks an automatic redirect
  // cycle (which would complete in well under a second), NOT the policy for
  // how often a user may be re-checked — that lives client-side, per trigger.
  // Making this long would block a returning user's immediate re-check and
  // leave them staring at a signed-out page after signing in elsewhere.
  cookieStore.set(silentSsoCookieName(logtoConfig.appId), "1", {
    maxAge: SERVER_COOLDOWN_SECONDS,
    path: "/",
    // Lax, never Strict: the response coming back from Logto is a cross-site
    // initiated navigation, and Strict would drop the cookie on that hop —
    // which would defeat the guard exactly when it matters most.
    sameSite: "lax",
    httpOnly: false,
    secure: logtoConfig.cookieSecure,
  });

  await signIn(logtoConfig, {
    redirectUri: `${logtoConfig.baseUrl}/callback`,
    postRedirectUri: `${logtoConfig.baseUrl}${returnTo}`,
    // On the consent retry, omit `prompt` entirely so the SDK's default
    // (`prompt=consent`) applies and the grant can actually be recorded.
    // `prompt=none` is barred from any UI, which is precisely why it could
    // not resolve the missing grant on its own.
    ...(isConsentRetry ? {} : { prompt: Prompt.None }),
    // Critical: the SDK clears stored tokens before a sign-in by default. For
    // an already-signed-in user doing a routine liveness check, that would
    // sign them out locally the moment anything went wrong mid-flight.
    clearTokens: false,
  });

  // Not reached: signIn() redirects by throwing.
  return NextResponse.redirect(new URL(returnTo, request.nextUrl.origin));
}
