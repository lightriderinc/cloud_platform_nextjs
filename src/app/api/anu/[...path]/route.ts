import { createProxyRoute } from "@/lib/createProxyRoute";

// Proxy to the ANU Quantum Random Number Generator (Australian National
// University). Forwards /api/anu/<path> to https://qrng.anu.edu.au/<path>.
//
// ANU's free QRNG is public and unauthenticated (requireToken:false). It is
// rate-limited (roughly one request per minute) and can be briefly unavailable,
// so callers should fetch a decent chunk of bytes at once and fall back
// gracefully. The short cache coalesces bursts without changing what a caller
// would have seen.
export const dynamic = "force-dynamic";

export const GET = createProxyRoute({
  baseUrl: "https://qrng.anu.edu.au",
  requireToken: false,
  cacheTtlMs: 2_000,
});
