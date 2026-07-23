import { NextRequest, NextResponse } from "next/server";
import { requireLogtoUser } from "@/lib/auth/session";

// Proxies entropy draws to the EMS egress service (light-rider-platform),
// server-side, so the caller is always an authenticated cloud-platform user
// rather than an anonymous EMS caller.
//
// EMS's real auth is `Authorization: Bearer <key>` resolved against
// ems-admin's tier entitlements (see ems-egress/src/entitlement.rs) — an
// anonymous call is silently downgraded to the Free grant, which cannot draw
// from anything but pool_fastest and never has the multi_source feature. We
// send both `x-ems-api-key` (inert until EMS grows a route that reads it —
// see the iqm-proxy lr_-key/IAM pattern, flagged to Martin's side as a
// follow-up) and `Authorization: Bearer`, so an EMS_API_KEY provisioned with
// a real entitlement actually unlocks every source for every signed-in user
// today, matching the product's "no role/subscription gate on source
// selection" intent.
export const dynamic = "force-dynamic";

type SingleRequestBody = {
  mode: "single";
  policy: string;
  bytes: number;
  applicationId?: string;
  zoneId?: string;
  clientNonce?: string;
};

type MultiRequestBody = {
  mode: "multi";
  method: string;
  sourceIds: string[];
  bytes: number;
  applicationId?: string;
  clientNonce?: string;
};

type EntropyRequestBody = SingleRequestBody | MultiRequestBody;

export async function POST(request: NextRequest) {
  try {
    await requireLogtoUser();
  } catch {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const emsBaseUrl = process.env.EMS_BASE_URL;
  if (!emsBaseUrl) {
    return NextResponse.json(
      { error: "EMS_BASE_URL is not configured on the server." },
      { status: 500 },
    );
  }

  let body: EntropyRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let path: string;
  let emsBody: Record<string, unknown>;

  if (body.mode === "single") {
    path = "/v1/entropy/request";
    emsBody = {
      bytes: body.bytes,
      policy: body.policy,
      application_id: body.applicationId ?? "",
      zone_id: body.zoneId ?? "",
      client_nonce: body.clientNonce ?? "",
    };
  } else if (body.mode === "multi") {
    path = "/v1/entropy/multi";
    emsBody = {
      bytes: body.bytes,
      method: body.method,
      source_ids: body.sourceIds,
      application_id: body.applicationId ?? "",
      client_nonce: body.clientNonce ?? "",
    };
  } else {
    return NextResponse.json(
      { error: "mode must be 'single' or 'multi'." },
      { status: 400 },
    );
  }

  const emsApiKey = process.env.EMS_API_KEY ?? "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-ems-api-key": emsApiKey,
  };
  if (emsApiKey) {
    headers.Authorization = `Bearer ${emsApiKey}`;
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${emsBaseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(emsBody),
      cache: "no-store",
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[ems-entropy] failed to reach EMS (${emsBaseUrl}${path}):`, detail);
    return NextResponse.json(
      { error: "Failed to reach EMS.", detail },
      { status: 502 },
    );
  }

  const responseBody = await upstream.text();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
