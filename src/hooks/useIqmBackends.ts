"use client";

import { useBackendSource } from "./useBackendSource";
import { fetchIqmBackends } from "@/lib/iqm/client";

export function useIqmBackends() {
  return useBackendSource("iqm", fetchIqmBackends);
}
