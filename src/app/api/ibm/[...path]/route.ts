import { createProxyRoute } from "@/lib/createProxyRoute";
import { getIbmAuthHeaders } from "@/lib/ibm/auth";

// Proxy to the IBM Quantum (Qiskit Runtime) REST API. Forwards
// /api/ibm/<path> and attaches IBM's auth headers server-side. Because IBM
// uses a short-lived IAM token (not a static key), auth is supplied by an async
// provider that caches and refreshes the token; see src/lib/ibm/auth.ts.
//
// Base URL defaults to the us-east region host; set IBM_QUANTUM_BASE_URL to
// https://eu-de.quantum.cloud.ibm.com for an eu-de instance. Uses `||` (not
// `??`) so an empty env value (e.g. from copying .env.example) still falls back.
export const dynamic = "force-dynamic";

export const GET = createProxyRoute({
  baseUrl: process.env.IBM_QUANTUM_BASE_URL || "https://quantum.cloud.ibm.com",
  authHeaders: getIbmAuthHeaders,
  cacheTtlMs: 30_000,
});
