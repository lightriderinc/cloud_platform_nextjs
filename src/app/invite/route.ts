import { logtoConfig } from "@/app/logto";
import {
  INVITE_COOKIE_MAX_AGE_SECONDS,
  INVITE_TOKEN_COOKIE,
} from "@/lib/billing/inviteCookie";
import { resolveInviteToken } from "@/lib/billing/invites";
import { signIn } from "@logto/next/server-actions";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /invite?token=... — where an invite link lands.
 *
 * A Route Handler rather than a page, because this has to SET a cookie:
 * Next.js does not allow cookie writes during Server Component rendering, so
 * the page version of this threw at runtime while type-checking and building
 * perfectly happily.
 *
 * Valid token -> park the token in a short-lived cookie (the only way to
 * carry it through Logto, which knows nothing about invites) and hand the
 * visitor to Logto's registration screen with their address pre-filled.
 * /callback picks the cookie back up once they are signed in.
 *
 * Anything else -> /invite/expired, which says so plainly. The distinction
 * between "expired", "already used" and "never existed" is deliberately NOT
 * surfaced: this endpoint is unauthenticated, and answering precisely would
 * let anyone probe which tokens exist.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = await resolveInviteToken(token);

  if (result.status !== "valid") {
    const target = new URL("/invite/expired", request.nextUrl.origin);
    target.searchParams.set(
      "reason",
      result.status === "expired" ? "expired" : "invalid",
    );
    return NextResponse.redirect(target);
  }

  const cookieStore = await cookies();
  cookieStore.set(INVITE_TOKEN_COOKIE, result.invite.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: logtoConfig.cookieSecure,
    maxAge: INVITE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

  // Throws a Next redirect to Logto; nothing after this runs.
  await signIn(logtoConfig, {
    redirectUri: `${logtoConfig.baseUrl}/callback`,
    firstScreen: "identifier:register",
    identifiers: ["email"],
    loginHint: result.invite.email,
  });
}
