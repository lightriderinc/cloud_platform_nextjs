"use client";

import { useMemo } from "react";
import { useBackendStatus, withServerStatus } from "./useBackendStatus";
import { useTwoPhaseBackendSource } from "./useTwoPhaseBackendSource";
import { fetchIqmBackends, fetchIqmSummaries } from "@/lib/iqm/client";

// IQM cards paint from the cheap architecture + health endpoints first; the
// heavy calibration metrics (fidelities, qubit map colors) arrive as a second
// phase behind the scenes, refreshed once a minute.
//
// The status badge comes from one of two places (env IQM_STATUS_SOURCE): the
// server-side status light (useBackendStatus, polled every 30s) when it's
// "server", or the legacy status computed in lib/iqm/client.ts otherwise.
const ONE_MINUTE = 60 * 1000;

export function useIqmBackends() {
  const catalog = useTwoPhaseBackendSource(
    "iqm",
    fetchIqmSummaries,
    fetchIqmBackends,
    ONE_MINUTE,
  );
  const serverStatus = useBackendStatus();
  const data = useMemo(
    () => withServerStatus(catalog.data, serverStatus),
    [catalog.data, serverStatus],
  );
  // Statuses can still change until the status light has answered once: in
  // "server" mode the cards switch from the legacy light to the server's.
  return { ...catalog, data, isStatusLoading: !serverStatus.settled };
}
