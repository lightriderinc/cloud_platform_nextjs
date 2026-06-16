import { NextRequest, NextResponse } from "next/server";

// Server-side proxy to IQM Resonance (Cocos REST API).
//
// Any GET to /api/iqm/<path> is forwarded to https://resonance.iqm.tech/<path>
// with the server's IQM bearer token attached, so the token never reaches the
// browser. Mirrors the LightRider /lr/* proxy pattern.
//
// Example client calls:
//   /api/iqm/api/v1/quantum-computers/garnet/artifacts/static-quantum-architectures
//   /api/iqm/api/v1/calibration-sets/garnet/default/metrics

const IQM_BASE_URL = "https://resonance.iqm.tech";

// Reads the token per-request, so this handler is always dynamic.
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const token = process.env.IQM_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "IQM_TOKEN is not configured on the server." },
      { status: 500 },
    );
  }

  const { path } = await params;
  const target = `${IQM_BASE_URL}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach IQM Resonance." },
      { status: 502 },
    );
  }

  // Pass the upstream body and status straight through.
  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
