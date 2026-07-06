"use client";

import { useBackendSource } from "./useBackendSource";
import { fetchIqmBackends } from "@/lib/iqm/client";

// IQM availability comes from a health endpoint that refreshes every ~15s, so
// poll once a minute to keep the online/offline status current.
const ONE_MINUTE = 60 * 1000;

export function useIqmBackends() {
  return useBackendSource("iqm", fetchIqmBackends, ONE_MINUTE);
}
