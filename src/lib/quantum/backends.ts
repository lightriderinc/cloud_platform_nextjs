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
    costPerShotCents: 0.2, // $0.002/shot ($2 per 1,000 shots)
  },
  "iqm-emerald-mock": {
    proxyPath: "/jobs",
    deviceInstance: "emerald:mock",
    costPerShotCents: 0, // free — mock backend, no credits required
  },
  "iqm-emerald": {
    proxyPath: "/jobs",
    deviceInstance: "emerald",
    costPerShotCents: 0.2, // $0.002/shot ($2 per 1,000 shots)
  },
  "iqm-sirius-mock": {
    proxyPath: "/jobs",
    deviceInstance: "sirius:mock",
    costPerShotCents: 0, // free — mock backend, no credits required
  },
  "iqm-sirius": {
    proxyPath: "/jobs",
    deviceInstance: "sirius",
    costPerShotCents: 0.2, // $0.002/shot ($2 per 1,000 shots)
  },
  "rigetti-cepheus-mock": {
    proxyPath: "/jobs",
    deviceInstance: "rigetti:mock",
    costPerShotCents: 0, // free — mock backend, no credits required
  },
  "rigetti-cepheus": {
    proxyPath: "/jobs",
    deviceInstance: "Cepheus-1-108Q",
    // PLACEHOLDER: reuses the IQM real-hardware rate ($0.002/shot) as a
    // stand-in. Rigetti/QCS bills by QPU-time (per-second), not per-shot —
    // this needs replacing with real per-second pricing once qpu-proxy
    // exposes it. Do not treat this figure as final.
    costPerShotCents: 0.2,
  },
} as const;

export type QuantumBackendId = keyof typeof QUANTUM_BACKENDS;

export function isValidBackend(id: string): id is QuantumBackendId {
  return id in QUANTUM_BACKENDS;
}

// Maps a /backends catalog card's Backend.id (e.g. "iqm.garnet", from
// src/lib/iqm/client.ts) to the QuantumBackendId used by
// /api/lr/quantum/submit. The catalog lists 6 IQM machines (garnet/emerald/
// sirius, each with a :mock variant) plus Rigetti and IBM devices — all 6
// IQM ones are wired up for API submission now.
//
// "rigetti-cepheus-mock" and "rigetti-cepheus" are both mapped below — the
// mock from "rigetti.qpu.Cepheus-1-108Q:mock" (synthetic card, see
// mockBackend() in rigetti/client.ts), the real one from
// "rigetti.qpu.Cepheus-1-108Q". qpu-proxy + rigetti-proxy now support live
// execution on real Cepheus-1-108Q, gated by a pre-submission availability
// check (submit/route.ts turns a 503 "no capacity" response into a
// BackendBusyError — see client.ts). This same lookup drives the /backends
// card's "Coming soon" badge and Connect-section panel (BackendCard.tsx,
// BackendList.tsx, BackendConnectSection.tsx all key off
// `getQuantumBackendId(...) === null`), so mapping "rigetti-cepheus" flips
// that card from "Coming soon" to the normal credit-gated real-hardware
// submit flow, same as the IQM real backends below. IBM still isn't wired up
// at all.
//
// Returns null for every other card so the UI can show "not available yet"
// instead of a snippet with a backend id that would 400.
//
// Note: the :mock entries below are inert in BackendConnectSection.tsx
// today — that component's own `backend.type !== "QPU"` check intercepts
// every Simulator-typed card (which is what garnet:mock/emerald:mock/
// sirius:mock all are) before this mapping is ever consulted. Included
// anyway for a complete, honest mapping; harmless either way.
const CATALOG_ID_TO_QUANTUM_BACKEND: Partial<Record<string, QuantumBackendId>> = {
  "iqm.garnet": "iqm-garnet",
  "iqm.garnet:mock": "iqm-garnet-mock",
  "iqm.emerald": "iqm-emerald",
  "iqm.emerald:mock": "iqm-emerald-mock",
  "iqm.sirius": "iqm-sirius",
  "iqm.sirius:mock": "iqm-sirius-mock",
  "rigetti.qpu.Cepheus-1-108Q:mock": "rigetti-cepheus-mock",
  "rigetti.qpu.Cepheus-1-108Q": "rigetti-cepheus",
};

export function getQuantumBackendId(catalogBackendId: string): QuantumBackendId | null {
  return CATALOG_ID_TO_QUANTUM_BACKEND[catalogBackendId] ?? null;
}
