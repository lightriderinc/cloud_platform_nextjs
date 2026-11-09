"use server";

import { logtoConfig } from "@/app/logto";
import { sanitizeReturnTo } from "@/lib/auth/silent-sso";
import { signIn, signOut } from "@logto/next/server-actions";
import { headers } from "next/headers";

export async function handleSignIn() {
  // Come back to the page the "Log in" click was made on. A Server Action is a
  // POST from that page, so its Referer is the page URL; only the path is
  // kept, and sanitizeReturnTo pins it to this origin (anything odd -> "/").
  // The SDK's handleSignIn in /callback redirects to postRedirectUri.
  let returnTo = "/";
  try {
    const referer = new URL((await headers()).get("referer") ?? "");
    returnTo = sanitizeReturnTo(`${referer.pathname}${referer.search}`);
  } catch {
    // No or malformed Referer — fall back to the home page.
  }

  await signIn(logtoConfig, {
    redirectUri: `${logtoConfig.baseUrl}/callback`,
    postRedirectUri: `${logtoConfig.baseUrl}${returnTo}`,
  });
}

export async function handleSignOut() {
  await signOut(logtoConfig);
}
