import { logtoConfig } from "@/app/logto";
import { db } from "@/lib/billing/db";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Generous upper bound on how long any session could plausibly still be
// "valid" locally — independent of the session's actual TTL, just a
// retention horizon so this table doesn't grow forever.
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function oidcIssuer(): string {
  return `${logtoConfig.endpoint.replace(/\/$/, "")}/oidc`;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
function getJwks() {
  jwks ??= createRemoteJWKSet(new URL(`${oidcIssuer()}/jwks`));
  return jwks;
}

/**
 * Verifies an OIDC back-channel logout token (OpenID Connect Back-Channel
 * Logout 1.0) and, on success, records its `sid` as revoked so
 * getSession()/requireLogtoUser() reject any cookie carrying it. Throws on
 * any validation failure — the caller (the webhook route) should respond
 * 400 rather than swallow it, so a misconfigured sender is visible in logs.
 */
export async function processBackchannelLogoutToken(logoutToken: string): Promise<void> {
  const { payload } = await jwtVerify(logoutToken, getJwks(), {
    issuer: oidcIssuer(),
    audience: logtoConfig.appId,
  });

  // Per spec (§2.6): MUST NOT contain a nonce, MUST contain an `events`
  // member with the back-channel-logout event key, and MUST contain `sid`
  // and/or `sub` — we require `sid` since that's what a session check keys
  // on (a `sub`-only token would mean "log this user out everywhere", which
  // this app doesn't need to support today).
  if (payload.nonce !== undefined) {
    throw new Error("logout token must not contain a nonce claim");
  }
  const events = payload.events as Record<string, unknown> | undefined;
  if (!events || !("http://schemas.openid.net/event/backchannel-logout" in events)) {
    throw new Error("logout token missing the backchannel-logout event claim");
  }
  const sid = typeof payload.sid === "string" ? payload.sid : undefined;
  if (!sid) {
    throw new Error("logout token missing sid claim");
  }

  const expiresAt = new Date(Date.now() + RETENTION_MS);
  await db.$transaction([
    db.revokedLogtoSession.upsert({
      where: { sid },
      create: { sid, expiresAt },
      update: { expiresAt },
    }),
    // Opportunistic cleanup — cheap, and avoids needing a separate cron job
    // just to keep this table small.
    db.revokedLogtoSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
  ]);
}

/** Whether `sid` (an ID token's `sid` claim) was revoked via back-channel logout. */
export async function isSessionRevoked(sid: string | undefined): Promise<boolean> {
  if (!sid) return false;
  const revoked = await db.revokedLogtoSession.findUnique({ where: { sid } });
  return Boolean(revoked);
}
