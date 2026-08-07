import { createProxyRoute } from "@/lib/createProxyRoute";

// Proxy to IQM Resonance (Cocos REST API). Forwards /api/iqm/<path> with the
// server-side IQM_TOKEN bearer header so the token never reaches the browser.
export const dynamic = "force-dynamic";

// The per-machine `health` endpoint is the source of the live status badge:
// lib/iqm/client.ts reads its `updated_at` and marks a machine Unknown once
// that timestamp ages out. Caching health at the same 30s as the heavy catalog
// payloads froze that timestamp and replayed it, so on repeated refreshes a
// healthy machine drifted to Unknown. Cache health only briefly (enough to
// coalesce refresh/tab bursts) and never serve it too stale for the freshness
// check; the large, slow-changing payloads (architecture, calibration metrics)
// keep the longer cache.
const isHealthPath = (path: string[]) => path[path.length - 1] === "health";

export const GET = createProxyRoute({
  baseUrl: "https://resonance.iqm.tech",
  token: process.env.IQM_TOKEN,
  cacheTtlMs: (path) => (isHealthPath(path) ? 5_000 : 30_000),
  maxStaleMs: (path) => (isHealthPath(path) ? 10_000 : Infinity),
});
