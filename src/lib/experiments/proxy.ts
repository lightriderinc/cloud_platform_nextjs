import { resolveCustomerFromRequest } from "@/lib/auth/resolveCustomer";
import { NextRequest, NextResponse } from "next/server";

// Shared by every route under src/app/api/lr/experiments/* — mirrors
// src/lib/topology/proxy.ts's own discipline (server-side QUANTUM_PROXY_URL/
// QUANTUM_PROXY_SERVICE_KEY, full envelope passthrough) but kept as its own
// module rather than folded into topology/proxy.ts, matching how the
// upstream service itself keeps experiments_proxy.py separate from
// topology_proxy.py: a distinct extension point, so a new experiments route
// never means touching topology's own proxy.
//
// Unlike topology (read-only, always-200-or-network-failure), experiments
// routes have real, meaningful non-2xx responses (e.g. 400 "unknown role"
// from candidates, 404 from run lookup) that the UI must see verbatim — so
// any HTTP response from qpu-proxy, even non-2xx, is passed through with
// its real status and body. Only a network-level failure (qpu-proxy
// unreachable) becomes a 502 here.

export const DEFAULT_EXPERIMENTS_BACKEND_ID = "Cepheus-1-108Q";

export function resolveExperimentsBackendId(searchParams: URLSearchParams): string {
  return searchParams.get("backend_id") || DEFAULT_EXPERIMENTS_BACKEND_ID;
}

class ExperimentsProxyUnreachableError extends Error {}

async function forward(method: string, path: string, jsonBody?: unknown): Promise<Response> {
  try {
    return await fetch(`${process.env.QUANTUM_PROXY_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.QUANTUM_PROXY_SERVICE_KEY}`,
        ...(jsonBody !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(jsonBody !== undefined ? { body: JSON.stringify(jsonBody) } : {}),
      cache: "no-store",
    });
  } catch (err) {
    throw new ExperimentsProxyUnreachableError(String(err));
  }
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

async function passthrough(method: string, path: string, jsonBody?: unknown): Promise<NextResponse> {
  let res: Response;
  try {
    res = await forward(method, path, jsonBody);
  } catch (err) {
    console.error("qpu-proxy unreachable:", err);
    return NextResponse.json(
      { error: "Experiments service is currently unreachable. Try again later." },
      { status: 502 },
    );
  }

  const body = await res.json().catch(() => ({}));
  return NextResponse.json(body, { status: res.status });
}

/** GET /v1/backends/{backend_id}/{suffixPath} — e.g. suffixPath "experiments" for the catalog. */
export async function proxyBackendExperimentsGet(req: NextRequest, suffixPath: string): Promise<NextResponse> {
  const unauthorized = await requireCustomer(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const backendId = resolveExperimentsBackendId(searchParams);
  return passthrough("GET", `/v1/backends/${encodeURIComponent(backendId)}/${suffixPath}`);
}

/** POST /v1/backends/{backend_id}/{suffixPath} — candidates/placement/runs. Body forwarded verbatim. */
export async function proxyBackendExperimentsPost(
  req: NextRequest,
  suffixPath: string,
  jsonBody: unknown,
): Promise<NextResponse> {
  const unauthorized = await requireCustomer(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const backendId = resolveExperimentsBackendId(searchParams);
  return passthrough("POST", `/v1/backends/${encodeURIComponent(backendId)}/${suffixPath}`, jsonBody);
}

/** GET /v1/experiments/runs/{runId} — NOT backend-scoped upstream (a run_id is already globally unique). */
export async function proxyRunGet(req: NextRequest, runId: string): Promise<NextResponse> {
  const unauthorized = await requireCustomer(req);
  if (unauthorized) return unauthorized;

  return passthrough("GET", `/v1/experiments/runs/${encodeURIComponent(runId)}`);
}
