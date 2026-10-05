import { createHash, timingSafeEqual } from "crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * Server-to-server auth for /api/internal/* - calls from other Light Rider
 * platforms' SERVERS (today: the entropy platform) that act on a user's
 * wallet. Never usable from a browser: every call needs BOTH of
 *
 *   X-Entropy-Billing-Secret: <ENTROPY_BILLING_SECRET>
 *     A shared secret proving WHICH APP is calling: the same random value is
 *     set in the cloud and entropy Vercel projects, one value per
 *     environment (dev and prod differ, so they never cross). Checked FIRST,
 *     in constant time; nothing else runs on a mismatch. This is what stops a
 *     user who got hold of their own access token from calling refund on
 *     themselves.
 *
 *   X-LR-User-Authorization: Bearer <user access token>
 *     The signed-in user's Logto access token, requested by the calling app
 *     for the billing API resource (LOGTO_BILLING_API_RESOURCE) and verified
 *     against this tenant's JWKS. Its `sub` is the Logto user id - the very
 *     value stored in Customer.logtoUserId - so the wallet is resolved from a
 *     token Logto signed, never from an id the caller merely asserts. Its
 *     client id must be on LOGTO_BILLING_USER_APP_IDS (apps allowed to act
 *     for a user).
 *
 * Both platforms sign in through the same Logto tenant, so a user's `sub` is
 * identical on cloud and entropy: one person, one Customer, one balance.
 */

export const BILLING_SECRET_HEADER = "x-entropy-billing-secret";
export const USER_TOKEN_HEADER = "x-lr-user-authorization";

export class ServiceAuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 500 = 401,
  ) {
    super(message);
  }
}

/**
 * Constant-time comparison of the presented secret with ENTROPY_BILLING_SECRET.
 * Both sides are hashed first so the comparison is fixed-length: neither the
 * content nor the length of the real secret leaks through timing.
 */
export function billingSecretMatches(presented: string | null): boolean {
  const expected = process.env.ENTROPY_BILLING_SECRET ?? "";
  if (!expected) throw new ServiceAuthError("ENTROPY_BILLING_SECRET is not configured.", 500);
  const a = createHash("sha256").update(presented ?? "").digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b) && presented !== null && presented.length > 0;
}

function issuer(): string {
  const endpoint = process.env.LOGTO_ENDPOINT;
  if (!endpoint) throw new ServiceAuthError("LOGTO_ENDPOINT is not configured.", 500);
  return `${endpoint.replace(/\/$/, "")}/oidc`;
}

function resource(): string {
  const r = process.env.LOGTO_BILLING_API_RESOURCE;
  if (!r) throw new ServiceAuthError("LOGTO_BILLING_API_RESOURCE is not configured.", 500);
  return r;
}

function idList(name: string): Set<string> {
  return new Set(
    (process.env[name] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
function getJwks() {
  jwks ??= createRemoteJWKSet(new URL(`${issuer()}/jwks`));
  return jwks;
}

async function verify(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: issuer(),
      audience: resource(),
    });
    return payload;
  } catch {
    throw new ServiceAuthError("Invalid or expired token.");
  }
}

function bearer(value: string | null): string | null {
  const m = value?.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export type ServiceCaller = {
  /** Logto user id of the user the call acts for (= Customer.logtoUserId). */
  userSub: string;
};

/**
 * Authenticates an internal call. Throws ServiceAuthError (401/403/500);
 * routes map it to a JSON error with that status.
 */
export async function authenticateServiceCall(request: Request): Promise<ServiceCaller> {
  // App credential first: on a mismatch nothing else (no JWKS fetch, no
  // token parsing) happens.
  if (!billingSecretMatches(request.headers.get(BILLING_SECRET_HEADER))) {
    throw new ServiceAuthError("This caller may not use the billing API.", 403);
  }

  const userToken = bearer(request.headers.get(USER_TOKEN_HEADER));
  if (!userToken) throw new ServiceAuthError("Missing user token.");

  const user = await verify(userToken);
  const userClient = String(user.client_id ?? "");
  const userSub = String(user.sub ?? "");
  // `sub === client_id` is a client-credentials (app) token, not a user.
  if (!userSub || userSub === userClient || !idList("LOGTO_BILLING_USER_APP_IDS").has(userClient)) {
    throw new ServiceAuthError("User token was not issued to an allowed application.", 403);
  }

  return { userSub };
}
