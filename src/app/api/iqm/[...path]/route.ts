import { createProxyRoute } from "@/lib/createProxyRoute";

// Proxy to IQM Resonance (Cocos REST API). Forwards /api/iqm/<path> with the
// server-side IQM_TOKEN bearer header so the token never reaches the browser.
export const dynamic = "force-dynamic";

// `health` and `queue-availability` are the live per-machine signals behind the
// status badge and the queue/availability display: lib/iqm/client.ts reads
// health's `updated_at` (marking a machine Unknown once it ages out) and
// queue-availability's `queue_length` / `available` windows. Caching either at
// the same 30s as the heavy catalog payloads freezes those values and replays
// them — e.g. a healthy machine drifts to Unknown on repeated refreshes. Cache
// them only briefly (enough to coalesce refresh/tab bursts) and never serve
// them too stale; the large, slow-changing payloads (architecture, calibration
// metrics) keep the longer cache.
const isLivePath = (path: string[]) => {
  const last = path[path.length - 1];
  return last === "health" || last === "queue-availability";
};

export const GET = createProxyRoute({
  baseUrl: "https://resonance.iqm.tech",
  token: process.env.IQM_TOKEN,
  cacheTtlMs: (path) => (isLivePath(path) ? 5_000 : 30_000),
  maxStaleMs: (path) => (isLivePath(path) ? 10_000 : Infinity),
});
