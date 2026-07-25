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
