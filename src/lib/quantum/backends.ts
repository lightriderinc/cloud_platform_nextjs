// V2 product model: no Pro subscription gate anywhere — access is purely
// credit-balance-based (see /api/lr/quantum/submit). Mock backends are free
// and unlimited (costPerShotCents: 0 makes the credit check a natural
// no-op); real QPU backends cost credits, prepaid, no subscription involved.
//
// deviceInstance: the literal string iqm-proxy's per-request device registry
// (proto/device-instance-routing branch, iqm-proxy/app.py DEVICE_REGISTRY)
// expects in the outgoing `device_instance` field — verified directly against
// that registry, not assumed. Without it, iqm-proxy falls back to whatever
// its own IQM_SERVER env var's trailing alias is, which is exactly the
// single-hardcoded-device behavior this is meant to replace.
export const QUANTUM_BACKENDS = {
  "iqm-garnet-mock": {
    proxyPath: "/jobs",
    deviceInstance: "garnet:mock",
    costPerShotCents: 0, // free — mock backend, no credits required
  },
  "iqm-garnet": {
    proxyPath: "/jobs",
    deviceInstance: "garnet",
    costPerShotCents: 1, // TODO: real pricing, placeholder only
  },
} as const;

export type QuantumBackendId = keyof typeof QUANTUM_BACKENDS;

export function isValidBackend(id: string): id is QuantumBackendId {
  return id in QUANTUM_BACKENDS;
}

// Maps a /backends catalog card's Backend.id (e.g. "iqm.garnet", from
// src/lib/iqm/client.ts) to the QuantumBackendId used by
// /api/lr/quantum/submit. The catalog currently lists 6 IQM machines (garnet/
// emerald/sirius, each with a :mock variant) plus Rigetti and IBM devices —
// only these two are actually wired up for API submission today. Returns
// null for every other card so the UI can show "not available yet" instead
// of a snippet with a backend id that would 400.
const CATALOG_ID_TO_QUANTUM_BACKEND: Partial<Record<string, QuantumBackendId>> = {
  "iqm.garnet": "iqm-garnet",
  "iqm.garnet:mock": "iqm-garnet-mock",
};

export function getQuantumBackendId(catalogBackendId: string): QuantumBackendId | null {
  return CATALOG_ID_TO_QUANTUM_BACKEND[catalogBackendId] ?? null;
}
