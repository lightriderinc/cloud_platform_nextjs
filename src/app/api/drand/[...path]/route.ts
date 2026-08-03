import { createProxyRoute } from "@/lib/createProxyRoute";

// Proxy to the drand / League of Entropy distributed randomness beacon.
// Forwards /api/drand/<path> to https://api.drand.sh/<path>.
//
// drand is a public, unauthenticated, publicly-verifiable beacon, so no
// credentials are attached (requireToken:false). The proxy keeps the same
// server-side call pattern as the other providers, avoids browser CORS, and
// lightly caches repeat reads. We read the "quicknet" chain (~3s cadence), so a
// couple of seconds of caching never changes the value a caller would see.
export const dynamic = "force-dynamic";

export const GET = createProxyRoute({
  baseUrl: "https://api.drand.sh",
  requireToken: false,
  cacheTtlMs: 2_000,
});
