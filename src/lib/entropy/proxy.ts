import { resolveCustomerFromRequest } from "@/lib/auth/resolveCustomer";
import { NextRequest, NextResponse } from "next/server";

// Server-side proxy to qpu-proxy's entropy pool service (GET .../entropy/pools,
// POST .../entropy/withdraw) -- same split-by-domain convention as
// lib/topology/proxy.ts and lib/experiments/proxy.ts: its own module so a
// change here never touches those. QUANTUM_PROXY_URL/QUANTUM_PROXY_SERVICE_KEY
// are read server-side only and never reach the browser. Withdraw has a
// real, meaningful 200 "insufficient" response body (not an error) and
// candidates-style non-2xx responses are passed through with their real
// status/body unchanged -- only a network-level failure becomes a 502.

export const DEFAULT_ENTROPY_BACKEND_ID = "Cepheus-1-108Q";

function resolveBackendId(searchParams: URLSearchParams): string {
  return searchParams.get("backend_id") || DEFAULT_ENTROPY_BACKEND_ID;
}

async function requireCustomer(req: NextRequest): Promise<NextResponse | null> {
  const customer = await resolveCustomerFromRequest(req);
  if (!customer) {
    return NextResponse.json(
      { error: "Not signed in, and no valid API key provided." },
      { status: 401 },
    );
  }
  return null;
}

async function forward(method: string, path: string, jsonBody?: unknown): Promise<Response> {
  return fetch(`${process.env.QUANTUM_PROXY_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.QUANTUM_PROXY_SERVICE_KEY}`,
      ...(jsonBody !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(jsonBody !== undefined ? { body: JSON.stringify(jsonBody) } : {}),
    cache: "no-store",
  });
}

/** GET /v1/backends/{backend_id}/entropy/pools */
export async function proxyEntropyPoolsGet(req: NextRequest): Promise<NextResponse> {
  const unauthorized = await requireCustomer(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const backendId = resolveBackendId(searchParams);

  let res: Response;
  try {
    res = await forward("GET", `/v1/backends/${encodeURIComponent(backendId)}/entropy/pools`);
  } catch (err) {
    console.error("qpu-proxy unreachable:", err);
    return NextResponse.json(
      { error: "Entropy pool service is currently unreachable. Try again later." },
      { status: 502 },
    );
  }
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}

/** POST /v1/backends/{backend_id}/entropy/withdraw -- body forwarded verbatim. */
export async function proxyEntropyWithdrawPost(req: NextRequest, jsonBody: unknown): Promise<NextResponse> {
  const unauthorized = await requireCustomer(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const backendId = resolveBackendId(searchParams);

  let res: Response;
  try {
    res = await forward("POST", `/v1/backends/${encodeURIComponent(backendId)}/entropy/withdraw`, jsonBody);
  } catch (err) {
    console.error("qpu-proxy unreachable:", err);
    return NextResponse.json(
      { error: "Entropy pool service is currently unreachable. Try again later." },
      { status: 502 },
    );
  }
  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}
