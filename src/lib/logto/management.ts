import { logtoConfig } from "@/app/logto";
import type { SocialIdentity } from "@/lib/logto-account";

// Server-only. Machine-to-machine client for the Logto Management API,
// used to assign roles that Stripe webhooks unlock (e.g. the Pro role once
// a validation subscription goes active). Never import from a client
// component — LOGTO_M2M_APP_SECRET must stay server-side.

const TOKEN_EXPIRY_BUFFER_MS = 60_000;

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function endpointBase(): string {
  return logtoConfig.endpoint.replace(/\/$/, "");
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > TOKEN_EXPIRY_BUFFER_MS) {
    return cachedToken.accessToken;
  }

  const appId = process.env.LOGTO_M2M_APP_ID;
  const appSecret = process.env.LOGTO_M2M_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      "LOGTO_M2M_APP_ID / LOGTO_M2M_APP_SECRET are not configured.",
    );
  }

  const endpoint = endpointBase();
  const basicAuth = Buffer.from(`${appId}:${appSecret}`).toString("base64");

  const res = await fetch(`${endpoint}/oidc/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      resource: `${endpoint}/api`,
      scope: "all",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch Logto Management API token (${res.status}): ${detail}`,
    );
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

/**
 * Assigns a role to a Logto user via the Management API. A 422 response
 * means the user already has the role, which is treated as success since
 * the end state is what we want.
 */
export async function assignRoleToUser(
  logtoUserId: string,
  roleId: string,
): Promise<void> {
  const token = await getAccessToken();

  const res = await fetch(`${endpointBase()}/api/users/${logtoUserId}/roles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ roleIds: [roleId] }),
  });

  if (res.ok || res.status === 422) {
    return;
  }

  const detail = await res.text().catch(() => "");
  throw new Error(
    `Failed to assign Logto role ${roleId} to user ${logtoUserId} (${res.status}): ${detail}`,
  );
}

/**
 * Revokes a role from a Logto user via the Management API. A 404 response
 * means the user didn't have the role, which is treated as success since
 * the end state is what we want.
 */
export async function revokeRoleFromUser(
  logtoUserId: string,
  roleId: string,
): Promise<void> {
  const token = await getAccessToken();

  const res = await fetch(
    `${endpointBase()}/api/users/${logtoUserId}/roles/${roleId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (res.ok || res.status === 404) {
    return;
  }

  const detail = await res.text().catch(() => "");
  throw new Error(
    `Failed to revoke Logto role ${roleId} from user ${logtoUserId} (${res.status}): ${detail}`,
  );
}

export type UserAccountFacts = {
  /** Linked social identities keyed by connector target (e.g. `google`). */
  identities: Record<string, SocialIdentity>;
  /** Whether the user has a password credential, or null if it couldn't be read. */
  hasPassword: boolean | null;
};

/**
 * Fetches a user's linked social identities and password status via the
 * Management API (`GET /api/users/{userId}`).
 *
 * Unlike the end-user Account API (`/api/my-account`), these fields are NOT
 * gated by the Logto Account Center `fields` configuration, so this is the
 * reliable source for showing connected accounts and deciding between
 * "Set password" and "Change password" on the account page. Server-only —
 * relies on the M2M credentials.
 */
export async function getUserAccountFacts(
  logtoUserId: string,
): Promise<UserAccountFacts> {
  const token = await getAccessToken();

  const res = await fetch(`${endpointBase()}/api/users/${logtoUserId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch Logto user ${logtoUserId} (${res.status}): ${detail}`,
    );
  }

  const user = (await res.json()) as {
    identities?: Record<string, SocialIdentity>;
    hasPassword?: boolean;
  };

  return {
    identities: user.identities ?? {},
    hasPassword: user.hasPassword ?? null,
  };
}

export type LogtoUserSummary = {
  id: string;
  primaryEmail: string | null;
  username: string | null;
  name: string | null;
};

/**
 * Looks up a Logto user by exact primary email via the Management API. Returns
 * the matching user, or null when no account uses that email.
 *
 * Uses `mode.primaryEmail=exact`; matching is case-insensitive (Logto's
 * `isCaseSensitive` defaults to false), which is what we want since email
 * identifiers are compared case-insensitively. Primary emails are unique in
 * Logto, so there is at most one match.
 *
 * Docs: https://docs.logto.io/user-management/advanced-user-search
 */
export async function findUserByPrimaryEmail(
  email: string,
): Promise<LogtoUserSummary | null> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    "search.primaryEmail": email,
    "mode.primaryEmail": "exact",
    page: "1",
    page_size: "1",
  });

  const res = await fetch(`${endpointBase()}/api/users?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Failed to search Logto users by email (${res.status}): ${detail}`,
    );
  }

  const users = (await res.json()) as Array<{
    id: string;
    primaryEmail?: string | null;
    username?: string | null;
    name?: string | null;
  }>;

  const match = users[0];
  if (!match) {
    return null;
  }

  return {
    id: match.id,
    primaryEmail: match.primaryEmail ?? null,
    username: match.username ?? null,
    name: match.name ?? null,
  };
}
