import { logtoConfig } from "@/app/logto";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getManagementApiToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const m2mAppId = process.env.LOGTO_M2M_APP_ID;
  const m2mAppSecret = process.env.LOGTO_M2M_APP_SECRET;
  if (!m2mAppId || !m2mAppSecret) {
    throw new Error("LOGTO_M2M_APP_ID and LOGTO_M2M_APP_SECRET must be set in .env.local");
  }

  const res = await fetch(`${logtoConfig.endpoint}oidc/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${m2mAppId}:${m2mAppSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      resource: `${logtoConfig.endpoint}api`,
      scope: "all",
    }),
  });

  if (!res.ok) throw new Error(`Failed to get M2M token: ${await res.text()}`);
  const data = await res.json();

  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

async function managementApiFetch(
  path: string,
  init?: RequestInit,
  idempotentStatuses: number[] = []
) {
  const token = await getManagementApiToken();
  const res = await fetch(`${logtoConfig.endpoint}api${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok && !idempotentStatuses.includes(res.status))
    throw new Error(`Management API error: ${res.status} ${await res.text()}`);
  if (res.status === 204 || idempotentStatuses.includes(res.status)) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function grantProRole(userId: string) {
  // 422 = user already has this role; treat as success (idempotent)
  return managementApiFetch(
    `/roles/${logtoConfig.proRoleID}/users`,
    { method: "POST", body: JSON.stringify({ userIds: [userId] }) },
    [422]
  );
}

export async function revokeProRole(userId: string) {
  return managementApiFetch(`/users/${userId}/roles/${logtoConfig.proRoleID}`, {
    method: "DELETE",
  });
}

export async function getUserRoles(userId: string) {
  return managementApiFetch(`/users/${userId}/roles`);
}
