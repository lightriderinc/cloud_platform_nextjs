import { NextRequest, NextResponse } from "next/server";

// Server-side proxy to the LightRider quantum job API.
//
// Any GET to /api/lr/<path> is forwarded to LR_BASE_URL/<path>
// with the server's LR bearer token attached, so the token never
// travels over an unencrypted browser connection.
//
// Example client calls:
//   /api/lr/jobs
//   /api/lr/jobs/019e…/result

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const token = process.env.LR_TOKEN;
  const baseUrl = process.env.LR_BASE_URL ?? "http://93.127.215.63";

  if (!token) {
    return NextResponse.json(
      { error: "LR_TOKEN is not configured on the server." },
      { status: 500 },
    );
  }

  const { path } = await params;
  const target = `${baseUrl}/${path.join("/")}${request.nextUrl.search}`;

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
      { error: "Failed to reach LightRider API." },
      { status: 502 },
    );
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}
