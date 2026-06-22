"use client";

import { useQuery } from "@tanstack/react-query";
import type { Backend } from "@/types/backend";

const FIVE_MINUTES = 5 * 60 * 1000;

// Generic React Query hook for a live backend source. Each provider supplies a
// stable key and a fetcher that returns Backend[]; refreshes every 5 minutes.
export function useBackendSource(
  key: string,
  fetcher: () => Promise<Backend[]>,
) {
  return useQuery({
    queryKey: ["backends", key],
    queryFn: fetcher,
    staleTime: FIVE_MINUTES,
    refetchInterval: FIVE_MINUTES,
  });
}
