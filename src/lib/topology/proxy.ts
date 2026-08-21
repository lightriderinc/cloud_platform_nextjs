import { resolveCustomerFromRequest } from "@/lib/auth/resolveCustomer";
import { NextRequest, NextResponse } from "next/server";

// Shared by every route under src/app/api/lr/topology/* — each of those
// routes is a thin passthrough to one qpu-proxy topology endpoint, and this
// is the one place that knows the upstream URL/credential and the
// backend_id default, so the four route files stay nearly-empty wiring.
//
// Confirmed live (2026-08-19): QUANTUM_PROXY_URL already points at qpu-proxy
// (http://93.127.215.63:8200, not iqm-proxy), and QUANTUM_PROXY_SERVICE_KEY
// authenticates successfully against qpu-proxy's own users table — same env
// vars the reservation routes already use, reused as-is, no new credential.

export const DEFAULT_TOPOLOGY_BACKEND_ID = "Cepheus-1-108Q";

// Per LR-TECH-001 §1.4: endpoints are backend-agnostic
// (/v1/backends/{backend_id}/...), never hardcoded to Cepheus, so IQM/other
// backends can populate the same columns later without an API change.
export function resolveTopologyBackendId(searchParams: URLSearchParams): string {
  return searchParams.get("backend_id") || DEFAULT_TOPOLOGY_BACKEND_ID;
}

/**
 * Fetches one qpu-proxy topology endpoint for a given backend. Returns the
 * raw Response (not parsed) so callers can distinguish "unreachable" from
 * "reachable but non-2xx" the same way the reservation routes already do.
 */
function fetchTopologyEndpoint(backendId: string, path: string): Promise<Response> {
  return fetch(
    `${process.env.QUANTUM_PROXY_URL}/v1/backends/${encodeURIComponent(backendId)}/${path}`,
    { headers: { Authorization: `Bearer ${process.env.QUANTUM_PROXY_SERVICE_KEY}` } },
  );
}

/**
 * Shared handler body for every /api/lr/topology/* route: resolve the
 * caller (same auth as every other /api/lr/* route — read-only and free of
 * charge doesn't mean open/unauthenticated, same reasoning as
 * reservations/available), fetch the one upstream path, and return the
 * FULL envelope unchanged — backend_id, calibration_id, source_timestamp,
 * snapshot_age_seconds, is_stale, topology_provenance, descriptor_id,
 * ingest_status, and data all pass through verbatim. Never stripped down to
 * just `data`: a displayed fidelity is only meaningful against the snapshot
 * it came from, and the UI layer (lib/topology/client.ts) needs every one
 * of those fields to render calibration_id/staleness alongside the numbers.
 *
 * No plan/credit gating anywhere in this function, deliberately — topology
 * is read-only, costs no QPU time, and this pass has no plan gating at all.
 */
export async function proxyTopologyGet(req: NextRequest, upstreamPath: string): Promise<NextResponse> {
  const customer = await resolveCustomerFromRequest(req);
  if (!customer) {
    return NextResponse.json(
      { error: "Not signed in, and no valid API key provided." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const backendId = resolveTopologyBackendId(searchParams);

  const proxyRes = await fetchTopologyEndpoint(backendId, upstreamPath).catch((err) => {
    console.error("qpu-proxy unreachable:", err);
    return null;
  });

  if (!proxyRes || !proxyRes.ok) {
    return NextResponse.json(
      { error: "Topology data is currently unreachable. Try again later." },
      { status: 502 },
    );
  }

  const envelope = await proxyRes.json();
  return NextResponse.json(envelope);
}
