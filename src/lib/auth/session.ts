import { logtoConfig } from "@/app/logto";
import { getLogtoContext, type LogtoContext } from "@logto/next/server-actions";
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
