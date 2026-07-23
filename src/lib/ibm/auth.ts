// Server-side IBM Cloud auth for the /api/ibm proxy.
//
// The Qiskit Runtime REST API needs three headers on every call: a bearer
// token, the instance CRN (Service-CRN), and a dated API version. Unlike IQM's
// static token, the bearer token is a short-lived IBM Cloud IAM token exchanged
// from an API key and valid for ~1 hour, so we cache it in memory and refresh
// shortly before it expires. This module must only be imported server-side.

const IAM_TOKEN_URL = "https://iam.cloud.ibm.com/identity/token";
// Refresh a minute early so an in-flight request never uses an expired token.
const EXPIRY_SKEW_MS = 60_000;
// IBM requires a dated API version header; this is a known-good default.
const DEFAULT_API_VERSION = "2026-04-15";

interface CachedToken {
  token: string;
  expiresAt: number; // epoch milliseconds
}

interface IamTokenResponse {
  access_token: string;
  expires_in: number; // seconds
}

let cache: CachedToken | null = null;

// Returns a valid IAM bearer token, exchanging the API key only when the cached
// token is missing or about to expire. On failure it throws an error whose
// message carries the IAM status/body (never the token) for diagnostics.
async function getIamToken(apiKey: string): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt - EXPIRY_SKEW_MS > now) {
    return cache.token;
  }

  let res: Response;
  try {
    res = await fetch(IAM_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "urn:ibm:params:oauth:grant-type:apikey",
        apikey: apiKey,
      }),
      cache: "no-store",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`could not reach IBM IAM (${IAM_TOKEN_URL}): ${detail}`);
  }

  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`IBM IAM token exchange failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as IamTokenResponse;
  cache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cache.token;
}

// Full auth header set for a Qiskit Runtime REST request. Throws if the
// required environment variables are not configured.
export async function getIbmAuthHeaders(): Promise<Record<string, string>> {
  const apiKey = process.env.IBM_CLOUD_API_KEY;
  const crn = process.env.IBM_INSTANCE_CRN;
  if (!apiKey || !crn) {
    const missing = [
      !apiKey && "IBM_CLOUD_API_KEY",
      !crn && "IBM_INSTANCE_CRN",
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(`missing required env var(s): ${missing}`);
  }

  const token = await getIamToken(apiKey);
  return {
    Authorization: `Bearer ${token}`,
    "Service-CRN": crn,
    "IBM-API-Version": process.env.IBM_API_VERSION || DEFAULT_API_VERSION,
  };
}
