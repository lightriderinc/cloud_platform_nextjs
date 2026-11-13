"use client";

import type { Backend } from "@/types/backend";

// Production-only placeholder until the full IonQ integration on develop is
// merged into main; delete this file then (develop has its own live
// useIonqBackends). Same static pattern as IBM_STATIC_BACKENDS in
// useIbmBackends.ts: no fetch, status "unknown". None of these ids map to a
// QUANTUM_BACKENDS entry, so the cards show "Coming soon" and can't be
// submitted to; BackendCatalog also skips the detail popup for them.
const IONQ_COMING_SOON_BACKENDS: Backend[] = [
  {
    id: "ionq.forte-1",
    name: "IonQ Forte-1",
    type: "QPU",
    status: "unknown",
    qubits: 36,
    provider: "IonQ Cloud",
    queueDepth: null,
  },
  {
    id: "ionq.forte-enterprise-1",
    name: "IonQ Forte Enterprise-1",
    type: "QPU",
    status: "unknown",
    qubits: 36,
    provider: "IonQ Cloud",
    queueDepth: null,
  },
  {
    id: "ionq.forte-1:mock",
    name: "IonQ Forte-1 Noisy Simulator",
    type: "Simulator",
    status: "unknown",
    qubits: 36,
    provider: "IonQ Cloud",
    queueDepth: null,
  },
  {
    id: "ionq.ionq:mock",
    name: "IonQ Simulator",
    type: "Simulator",
    status: "unknown",
    qubits: 29,
    provider: "IonQ",
    queueDepth: null,
  },
];

export function isIonqComingSoonId(id: string): boolean {
  return id.startsWith("ionq.");
}

export function useIonqComingSoonBackends() {
  return { data: IONQ_COMING_SOON_BACKENDS, isLoading: false };
}
