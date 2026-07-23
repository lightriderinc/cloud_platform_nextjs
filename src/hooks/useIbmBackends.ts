"use client";

import { useTwoPhaseBackendSource } from "./useTwoPhaseBackendSource";
import { fetchIbmBackends, fetchIbmSummaries } from "@/lib/ibm/client";

// IBM cards paint from the cheap configuration/status endpoints first; the
// heavy per-qubit properties payload (fidelities, qubit map) arrives as a
// second phase behind the scenes and upgrades the same cards in place.
// IBM exposes live status + queue length, so keep polling once a minute.
const ONE_MINUTE = 60 * 1000;

export function useIbmBackends() {
  return useTwoPhaseBackendSource(
    "ibm",
    fetchIbmSummaries,
    fetchIbmBackends,
    ONE_MINUTE,
  );
}
