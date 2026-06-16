"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIqmBackends } from "@/lib/iqm/client";

const FIVE_MINUTES = 5 * 60 * 1000;

// React Query hook that loads the live IQM machines through the proxy and
// keeps them fresh on a 5-minute cadence.
export function useIqmBackends() {
  return useQuery({
    queryKey: ["iqm-backends"],
    queryFn: fetchIqmBackends,
    staleTime: FIVE_MINUTES,
    refetchInterval: FIVE_MINUTES,
  });
}
