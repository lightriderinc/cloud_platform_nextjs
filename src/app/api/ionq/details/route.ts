import { isIonqDetailDevice } from "@/lib/ionq/details";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/ionq/details?device=forte-1
//
// Full details for one IonQ device for the backend detail modal: qpu-proxy's
// GET /backends/ionq/{device}/details (status, queue time, characterization,
// capabilities and IonQ's raw JSON), passed through unchanged.
//
// Only the four IonQ devices are accepted, so this can't be used to reach any
// other qpu-proxy path. Same service-key auth as every other qpu-proxy call.
// The data is public device information (the catalog is public), so there is
// no user auth here; it is cached at the edge for a minute so the modal
// doesn't turn into one IonQ call per click.
const CACHE = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };
const UNAVAILABLE = { ok: false, error: "Details are unavailable." };

export async function GET(req: Request) {
  const device = new URL(req.url).searchParams.get("device");
  if (!isIonqDetailDevice(device)) {
    return NextResponse.json({ ok: false, error: "Unknown IonQ device." }, { status: 400 });
  }

  const res = await fetch(`${process.env.QUANTUM_PROXY_URL}/backends/ionq/${device}/details`, {
    headers: { Authorization: `Bearer ${process.env.QUANTUM_PROXY_SERVICE_KEY}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch((err) => {
    console.error(`[ionq-details] qpu-proxy unreachable for ${device}:`, err);
    return null;
  });
  if (!res || !res.ok) {
    if (res) console.error(`[ionq-details] qpu-proxy returned HTTP ${res.status} for ${device}`);
    return NextResponse.json(UNAVAILABLE, { status: 502 });
  }

  const body: unknown = await res.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof (body as { device_instance?: unknown }).device_instance !== "string") {
    console.error(`[ionq-details] unexpected response for ${device}`);
    return NextResponse.json(UNAVAILABLE, { status: 502 });
  }
  return NextResponse.json(body, { headers: CACHE });
}
