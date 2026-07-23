import { isPro } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// Server-side proxy to the LightRider quantum job API.
//
// Any GET/POST to /api/lr/<path> is forwarded to LR_BASE_URL/<path>
// with the server's LR bearer token attached, so the token never
// travels over an unencrypted browser connection.
//
// Example client calls:
//   /api/lr/jobs
//   /api/lr/jobs/019e…/result

export const dynamic = "force-dynamic";

/**
 * Job creation (POST /api/lr/jobs) runs real circuits on real quantum
 * hardware, so it's gated on the Logto Pro role — enforced here, not just
 * client-side, so it can't be bypassed by calling the endpoint directly.
 * Every current caller (NewJobModal, the dashboard's "sample circuit" demo)
 * hits this same path; there's no simulator-only submission path today.
 */
function isJobCreation(path: string[], method: string): boolean {
  return method === "POST" && path.length === 1 && path[0] === "jobs";
}

async function proxyRequest(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
  method: string,
) {
  const { path } = await params;

  // Checked before the LR_TOKEN/server-config check below, so an
  // unauthorized caller gets a clear 403 rather than a 500 that leaks
  // server misconfiguration details.
  if (isJobCreation(path, method) && !(await isPro())) {
    return NextResponse.json(
      {
        error: "Upgrade to Pro to run jobs on real quantum hardware.",
        upgradeUrl: "/pricing/user-plans",
      },
      { status: 403 },
    );
  }

  const token = process.env.LR_TOKEN;
  const baseUrl = process.env.LR_BASE_URL ?? "http://93.127.215.63";

  if (!token) {
    return NextResponse.json(
      { error: "LR_TOKEN is not configured on the server." },
      { status: 500 },
    );
  }

  const target = `${baseUrl}/${path.join("/")}${request.nextUrl.search}`;

  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(request.headers.get("Content-Type")
        ? { "Content-Type": request.headers.get("Content-Type")! }
        : {}),
    },
    cache: "no-store",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await request.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, params, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxyRequest(request, params, "POST");
}
