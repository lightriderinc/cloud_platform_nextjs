import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Live IonQ status for the /backends catalog: qpu-proxy's public GET /healthz,
// reduced to its backends.ionq section, i.e. IonQ's own GET /backends listing
// ({ ok, backends: { "qpu.forte-1": { status, degraded, qubits,
// average_queue_time, last_updated }, "simulator": {...} } }).
//
// This, not healthz's top-level "devices" map, is the live signal: "devices"
// is qpu-proxy's static registry and always says "available", even while
// Forte is in maintenance.
//
// No auth: it's public status. Cached at the edge for 30 s so a busy catalog
// page doesn't turn into one IonQ call per visitor.
const CACHE = { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" };

export async function GET() {
  const res = await fetch(`${process.env.QUANTUM_PROXY_URL}/healthz`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  }).catch((err) => {
    console.error("[ionq-status] qpu-proxy unreachable:", err);
    return null;
  });
  if (!res || !res.ok) {
    return NextResponse.json({ ok: false, error: "Live status is unavailable." }, { status: 502 });
  }

  const body: { backends?: { ionq?: unknown } } = await res.json().catch(() => ({}));
  const ionq = body.backends?.ionq;
  if (!ionq || typeof ionq !== "object") {
    return NextResponse.json({ ok: false, error: "Live status is unavailable." }, { status: 502 });
  }
  return NextResponse.json(ionq, { headers: CACHE });
}
