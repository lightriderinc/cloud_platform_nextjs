import { createProxyRoute } from "@/lib/createProxyRoute";

// Proxy to the NIST Interoperable Randomness Beacon (Version 2.0).
// Forwards /api/nist/<path> to https://beacon.nist.gov/beacon/2.0/<path>.
//
// The NIST beacon is a public, unauthenticated service, so no credentials are
// attached (requireToken:false). The proxy keeps the same server-side call
// pattern as the other providers, avoids browser CORS against beacon.nist.gov,
// and lightly caches repeat reads so rapid dice rolls don't hammer the beacon
// (a new pulse is published once a minute, so a few seconds of caching never
// changes the value a caller would have seen).
export const dynamic = "force-dynamic";

export const GET = createProxyRoute({
  baseUrl: "https://beacon.nist.gov/beacon/2.0",
  requireToken: false,
  cacheTtlMs: 5_000,
});
