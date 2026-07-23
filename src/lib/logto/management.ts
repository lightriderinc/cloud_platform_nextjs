import { logtoConfig } from "@/app/logto";

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
