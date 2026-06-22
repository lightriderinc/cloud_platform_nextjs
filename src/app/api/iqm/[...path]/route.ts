import { createProxyRoute } from "@/lib/createProxyRoute";

// Proxy to IQM Resonance (Cocos REST API). Forwards /api/iqm/<path> with the
// server-side IQM_TOKEN bearer header so the token never reaches the browser.
export const dynamic = "force-dynamic";

export const GET = createProxyRoute({
  baseUrl: "https://resonance.iqm.tech",
  token: process.env.IQM_TOKEN,
});
