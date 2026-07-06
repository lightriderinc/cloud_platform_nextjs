"use client";

import { useQuery } from "@tanstack/react-query";
import type { Backend } from "@/types/backend";

const FIVE_MINUTES = 5 * 60 * 1000;

// Generic React Query hook for a live backend source. Each provider supplies a
// stable key and a fetcher that returns Backend[]. `refreshMs` controls both
// how long data is considered fresh and how often it re-fetches; it defaults to
// 5 minutes but providers with live availability (e.g. IQM health) can poll
// more frequently.
export function useBackendSource(
  key: string,
  fetcher: () => Promise<Backend[]>,
  refreshMs: number = FIVE_MINUTES,
) {
  return useQuery({
    queryKey: ["backends", key],
    queryFn: fetcher,
    staleTime: refreshMs,
    refetchInterval: refreshMs,
  });
}
