export const QUANTUM_BACKENDS = {
  "iqm-garnet-mock": {
    proxyPath: "/jobs",
    requiresPro: true,
    costPerShotCents: 1, // TODO: real pricing, placeholder only
  },
  "iqm-garnet": {
    proxyPath: "/jobs",
    requiresPro: true,
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
