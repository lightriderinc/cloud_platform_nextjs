import { CookieStorage } from "@logto/node";
import NodeClient from "@logto/node/edge";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logtoConfig } from "./app/logto";

/**
 * Server Components can't write cookies (Next.js restriction), so
 * `getLogtoContext` from `@logto/next/server-actions` always reads/refreshes
 * with `ignoreCookieChange: true` — any token refresh it triggers is
 * discarded instead of saved back to the cookie. Since Logto refresh tokens
 * are single-use, the next request then presents the already-consumed
 * refresh token and Logto rejects it (`LogtoRequestError: Grant request is
 * invalid`), breaking auth until the cookie is cleared.
 *
 * Proxy runs before any Server Component and *can* write cookies, so it
 * refreshes and persists the token here, before it ever goes stale in RSC.
 */
export async function proxy(request: NextRequest) {
  const cookieKey = `logto_${logtoConfig.appId}`;
  const pendingCookies: Array<[string, string, Record<string, unknown>]> = [];

  const storage = new CookieStorage({
    encryptionKey: logtoConfig.cookieSecret,
    cookieKey,
    isSecure: logtoConfig.cookieSecure,
    getCookie: (name: string) => request.cookies.get(name)?.value ?? "",
    setCookie: (name: string, value: string, options: Record<string, unknown>) => {
      // Update the request cookie too, so this same render sees the fresh
      // token instead of only the *next* browser request seeing it.
      request.cookies.set(name, value);
      pendingCookies.push([name, value, options]);
    },
  });
  await storage.init();

  const nodeClient = new NodeClient(logtoConfig, {
    storage,
    navigate: () => {
      // No sign-in/out flows are initiated from Proxy.
    },
  });

  if (await nodeClient.isAuthenticated()) {
    try {
      await nodeClient.getAccessToken();
    } catch {
      // Refresh token was already invalid/consumed — clear the session so
      // the app treats this as signed-out instead of throwing on every page.
      await storage.destroy();
    }
  }

  const response = NextResponse.next({ request: { headers: request.headers } });
  for (const [name, value, options] of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
