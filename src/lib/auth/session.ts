import { logtoConfig } from "@/app/logto";
import { getLogtoContext } from "@logto/next/server-actions";

/**
 * Resolves the current Logto session server-side. Throws if unauthenticated
 * so route handlers can fail fast with a 401 rather than silently acting on
 * behalf of no one.
 */
export async function requireLogtoUser() {
  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);
  if (!isAuthenticated || !claims?.sub) {
    throw new Error("UNAUTHENTICATED");
  }
  return { sub: claims.sub, email: claims.email as string | undefined };
}
