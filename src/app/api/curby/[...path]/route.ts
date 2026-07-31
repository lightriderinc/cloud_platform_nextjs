import { createProxyRoute } from "@/lib/createProxyRoute";

// Proxy to the CURBy CU Randomness Beacon (University of Colorado Boulder).
// Forwards /api/curby/<path> to https://random.colorado.edu/api/<path>.
//
// CURBy is a public, unauthenticated beacon, so no credentials are attached
// (requireToken:false). The proxy exists to keep the same server-side call
// pattern as the other providers, avoid browser CORS against the CU domain,
// and lightly cache repeat reads so rapid dice rolls don't hammer the beacon
// (a new pulse is published roughly once a minute, so a few seconds of caching
// never changes the value a caller would have seen).
export const dynamic = "force-dynamic";

export const GET = createProxyRoute({
  baseUrl: "https://random.colorado.edu/api",
  requireToken: false,
  cacheTtlMs: 5_000,
});
