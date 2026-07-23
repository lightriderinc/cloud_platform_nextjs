"use client";

import { useTwoPhaseBackendSource } from "./useTwoPhaseBackendSource";
import { fetchIqmBackends, fetchIqmSummaries } from "@/lib/iqm/client";

// IQM cards paint from the cheap architecture + health endpoints first; the
// heavy calibration metrics (fidelities, qubit map colors) arrive as a second
// phase behind the scenes. Health refreshes every ~15s server-side, so keep
// polling once a minute to keep the status badge current.
const ONE_MINUTE = 60 * 1000;

export function useIqmBackends() {
  return useTwoPhaseBackendSource(
    "iqm",
    fetchIqmSummaries,
    fetchIqmBackends,
    ONE_MINUTE,
  );
}
