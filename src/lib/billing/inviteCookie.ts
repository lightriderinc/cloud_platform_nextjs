/**
 * Carries an invite token across the Logto sign-up redirect.
 *
 * /invite cannot hand the token to Logto — Logto has no idea invites exist —
 * and /callback is shared by every sign-in, so it has nothing to correlate a
 * new account with. A short-lived httpOnly cookie is the only join point
 * available without forking the callback route.
 *
 * httpOnly so no client script can forge one, and short-lived because it is
 * only ever meant to survive a single round trip to Logto and back.
 */
export const INVITE_TOKEN_COOKIE = "lr_invite_token";

/** Long enough to finish a sign-up (including email verification), not longer. */
export const INVITE_COOKIE_MAX_AGE_SECONDS = 30 * 60;
