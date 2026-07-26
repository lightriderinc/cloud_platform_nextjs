import { logtoConfig } from "@/app/logto";
import { getMyProfile } from "@/lib/logto-account";
import { getAccessToken, getLogtoContext, type LogtoContext } from "@logto/next/server-actions";
import { cache } from "react";

/**
 * Cached per-request Logto session lookup (fetches userInfo too). Every
 * Server Component that needs session data during a render shares this one
 * call instead of each calling `getLogtoContext` independently — Server
 * Components can't persist a refreshed token back to the cookie, so two
 * independent calls in the same render could otherwise race to refresh with
 * an already-consumed refresh token and throw `invalid_grant`.
 *
 * Falls back to signed-out on failure rather than throwing, so a Logto
 * hiccup degrades to a login prompt instead of crashing the whole layout.
 */
export const getSession = cache(async (): Promise<LogtoContext> => {
  try {
    return await getLogtoContext(logtoConfig, { fetchUserInfo: true });
  } catch {
    return { isAuthenticated: false };
  }
});

/**
 * Resolves the current Logto session server-side. Throws if unauthenticated
 * so route handlers can fail fast with a 401 rather than silently acting on
 * behalf of no one.
 *
 * Deliberately does not go through `getSession()` above: this never requests
 * `fetchUserInfo`, so it never triggers a token refresh and doesn't need the
 * same caching/fallback treatment — no need to pay for a userInfo fetch on
 * every API route that just wants `claims.sub`.
 */
export async function requireLogtoUser() {
  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);
  if (!isAuthenticated || !claims?.sub) {
    throw new Error("UNAUTHENTICATED");
  }
  return { sub: claims.sub, email: claims.email as string | undefined };
}

/**
 * Cached per-request fetch of the Logto Account API profile (top-level name,
 * username, avatar, plus nested profile fields). Returns null when the token
 * or Account API is unavailable, so callers can treat it as best-effort.
 */
export const getAccountProfile = cache(async () => {
  try {
    const token = await getAccessToken(logtoConfig);
    if (!token) return null;
    return await getMyProfile(token);
  } catch {
    return null;
  }
});

/**
 * Resolves the user's display name for the account card and account page.
 *
 * A brand-new user's ID-token / userinfo claims don't include `name` until
 * their first token refresh, which is why the name used to show as the
 * "Account" placeholder on first sign-in. The Account API reflects the name
 * immediately, so when the session claims lag we fall back to it: top-level
 * `name`, then given/family name, then username. Returns null only when no
 * name is set anywhere (callers pick their own final fallback).
 */
export const getDisplayName = cache(async (): Promise<string | null> => {
  const { isAuthenticated, claims, userInfo } = await getSession();
  if (!isAuthenticated) return null;

  const fromSession = userInfo?.name ?? claims?.name;
  if (fromSession) return fromSession;

  const account = await getAccountProfile();
  if (!account) return null;

  if (account.name) return account.name;

  const fullName = [account.profile?.givenName, account.profile?.familyName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fullName) return fullName;

  return account.username ?? null;
});
