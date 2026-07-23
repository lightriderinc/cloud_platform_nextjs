import { createProxyRoute } from "@/lib/createProxyRoute";

// Proxy to the Rigetti QCS API. The calibration endpoints are readable
// without auth, so a token is optional; if RIGETTI_TOKEN is set it is
// attached for authenticated access.
export const dynamic = "force-dynamic";

export const GET = createProxyRoute({
  baseUrl: "https://api.qcs.rigetti.com",
  token: process.env.RIGETTI_TOKEN,
  requireToken: false,
  cacheTtlMs: 60_000,
});
