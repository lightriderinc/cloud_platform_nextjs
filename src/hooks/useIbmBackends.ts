"use client";

import type { Backend } from "@/types/backend";
import { useTwoPhaseBackendSource } from "./useTwoPhaseBackendSource";
import { fetchIbmBackends, fetchIbmSummaries } from "@/lib/ibm/client";

// IBM cards paint from the cheap configuration/status endpoints first; the
// heavy per-qubit properties payload (fidelities, qubit map) arrives as a
// second phase behind the scenes and upgrades the same cards in place.
// IBM exposes live status + queue length, so keep polling once a minute.
const ONE_MINUTE = 60 * 1000;

// V2: IBM isn't wired into job submission (getQuantumBackendId returns null
// for every "ibm.*" id, same as Rigetti), so there's no reason to pay for a
// live IAM-token exchange + API round trip just to paint non-functional
// cards on /backends - that round trip was the single slowest contributor to
// /backends' cold-load time. Flip this back to true to restore live fetching
// with zero other code changes; fetchIbmSummaries/fetchIbmBackends and the
// /api/ibm proxy are untouched and fully wired, just not invoked right now.
const ENABLE_IBM_LIVE_FETCH = false;

// Static stand-ins shown while live fetching is disabled - the 3 hardcoded
// IBM machines (see ibm/client.ts's IBM_MACHINES) with their publicly known
// specs. status: "unknown" is deliberate and honest: we're not live-checking
// these, unlike when ENABLE_IBM_LIVE_FETCH is true.
const IBM_STATIC_BACKENDS: Backend[] = [
  {
    id: "ibm.kingston",
    name: "IBM Kingston",
    type: "QPU",
    status: "unknown",
    qubits: 156,
    provider: "IBM",
    queueDepth: null,
  },
  {
    id: "ibm.fez",
    name: "IBM Fez",
    type: "QPU",
    status: "unknown",
    qubits: 156,
    provider: "IBM",
    queueDepth: null,
  },
  {
    id: "ibm.marrakesh",
    name: "IBM Marrakesh",
    type: "QPU",
    status: "unknown",
    qubits: 156,
    provider: "IBM",
    queueDepth: null,
  },
];

export function useIbmBackends() {
  // Always call the hook (Rules of Hooks) - `enabled` just stops its
  // underlying queries from ever firing when the flag is off.
  const result = useTwoPhaseBackendSource(
    "ibm",
    fetchIbmSummaries,
    fetchIbmBackends,
    ONE_MINUTE,
    ENABLE_IBM_LIVE_FETCH,
  );

  if (!ENABLE_IBM_LIVE_FETCH) {
    return { data: IBM_STATIC_BACKENDS, isLoading: false, isLoadingDetails: false };
  }

  return result;
}
