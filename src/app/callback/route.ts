import { logtoConfig } from '@/app/logto';
import {
  CONSENT_RETRY_COOLDOWN_SECONDS,
  CONSENT_RETRY_PARAM,
  consentRetryCookieName,
  sanitizeReturnTo,
} from '@/lib/auth/silent-sso';
import { linkInviteOnSignIn } from '@/lib/billing/acceptInvite';
import { INVITE_TOKEN_COOKIE } from '@/lib/billing/inviteCookie';
import { getLogtoContext, handleSignIn } from '@logto/next/server-actions';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';

/**
 * OIDC redirect endpoint. Handles both flows that land here:
 *
 *  - A normal interactive sign-in, which arrives with `?code=...`.
 *  - A silent `prompt=none` liveness check (see @/lib/auth/silent-sso), which
 *    arrives with either a code (shared Logto session alive) or
 *    `?error=login_required` (no shared session). `login_required` is the
 *    expected negative answer here, NOT a failure — it must never throw or
 *    surface an error page.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get('error');
  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));

  if (error) {
    const target = new URL(returnTo, request.nextUrl.origin);

    if (error === 'login_required') {
      // Logto is telling us there is no shared session. If this app still
      // holds its own token, it is stale — the user signed out on another app
      // (or their Logto session expired), so drop it. For an app with no
      // revocation store this is its only sign-out propagation mechanism;
      // where back-channel logout exists this is the slower backstop.
      const response = NextResponse.redirect(target);
      response.cookies.delete({ name: `logto_${logtoConfig.appId}`, path: '/' });
      return response;
    }

    if (error === 'consent_required') {
      // The user IS signed in — Logto is only saying this app's scopes are not
      // granted in the current session (grants are per-session, so signing in
      // on another platform leaves this one ungranted). `prompt=none` can never
      // fix that, because it is forbidden from showing any UI.
      //
      // Retry exactly once without `prompt=none` so the SDK's default
      // `prompt=consent` records the grant. The session is already alive, so
      // this does not ask for credentials again. The cookie makes it single-
      // shot: if the retry also comes back consent_required we stop here and
      // leave the user to the manual "Log in" button rather than cycling.
      const cookieStore = await cookies();
      if (!cookieStore.get(consentRetryCookieName(logtoConfig.appId))) {
        const retry = new URL('/api/auth/silent-check', request.nextUrl.origin);
        retry.searchParams.set(CONSENT_RETRY_PARAM, '1');
        retry.searchParams.set('returnTo', returnTo);

        const response = NextResponse.redirect(retry);
        response.cookies.set(consentRetryCookieName(logtoConfig.appId), '1', {
          maxAge: CONSENT_RETRY_COOLDOWN_SECONDS,
          path: '/',
          sameSite: 'lax',
          httpOnly: false,
          secure: logtoConfig.cookieSecure,
        });
        return response;
      }

      console.warn('[callback] consent_required persisted after retry; leaving session untouched.');
      return NextResponse.redirect(target);
    }

    // Anything else (interaction_required, server errors) is NOT proof the
    // session ended, so the local session is deliberately left alone — signing
    // the user out on an ambiguous signal would be worse than briefly showing
    // stale state.
    console.error(`[callback] Logto returned error=${error}; leaving session untouched.`);
    return NextResponse.redirect(target);
  }

  await handleSignIn(logtoConfig, searchParams);

  // Link any invite this sign-in completes. Runs after handleSignIn so the
  // session exists and the Logto subject is readable.
  //
  // Runs on EVERY sign-in, not only when the /invite cookie survived. The
  // cookie is the precise signal but a fragile one — it has to survive a round
  // trip to Logto — and when it is lost the referral is silently dropped.
  // linkInviteOnSignIn falls back to matching a pending invite by email, but
  // only for a brand-new account, so a returning user is never retro-linked.
  //
  // Best-effort: it swallows its own errors, and the cookie is cleared either
  // way so a failed link can never wedge every later sign-in.
  const cookieStore = await cookies();
  const inviteToken = cookieStore.get(INVITE_TOKEN_COOKIE)?.value;
  if (inviteToken) {
    cookieStore.delete({ name: INVITE_TOKEN_COOKIE, path: '/' });
  }
  try {
    const { claims } = await getLogtoContext(logtoConfig);
    if (claims?.sub) {
      await linkInviteOnSignIn({
        token: inviteToken,
        logtoUserId: claims.sub,
        email: claims.email as string | undefined,
      });
    } else {
      // Reading the session in the same request that just created it. If it
      // comes back empty the invite silently never links, which is the single
      // most likely explanation for a referral that vanished without a trace.
      // Never diagnosable before, because this branch said nothing.
      console.error(
        `[callback] session not readable immediately after sign-in; invite linking skipped ` +
          `(token present: ${Boolean(inviteToken)}). If an invite is stuck pending, this is why.`,
      );
    }
  } catch (err) {
    console.error('[callback] invite linking failed; sign-in unaffected:', err);
  }

  redirect('/');
}
