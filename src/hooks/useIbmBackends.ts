"use client";

import { useBackendSource } from "./useBackendSource";
import { fetchIbmBackends } from "@/lib/ibm/client";

// IBM exposes live status + queue length via its backends list, so poll once a
// minute (like IQM) to keep the card's status and queue current.
const ONE_MINUTE = 60 * 1000;

export function useIbmBackends() {
  return useBackendSource("ibm", fetchIbmBackends, ONE_MINUTE);
}
