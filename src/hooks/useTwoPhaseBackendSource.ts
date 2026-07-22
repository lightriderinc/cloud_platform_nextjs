"use client";

import { useQuery } from "@tanstack/react-query";
import type { Backend } from "@/types/backend";

const FIVE_MINUTES = 5 * 60 * 1000;

// Two-phase variant of useBackendSource for providers whose card data is much
// cheaper than their full calibration payload. The summary query paints the
// catalog cards as fast as possible; once it settles, the full query fetches
// the heavy details (fidelities, qubit map) behind the scenes and replaces
// it. Only the full query polls - the summary is just a stepping stone.
export function useTwoPhaseBackendSource(
  key: string,
  fetchSummary: () => Promise<Backend[]>,
  fetchFull: () => Promise<Backend[]>,
  refreshMs: number = FIVE_MINUTES,
) {
  const summary = useQuery({
    queryKey: ["backends", key, "summary"],
    queryFn: fetchSummary,
    staleTime: refreshMs,
  });

  const full = useQuery({
    queryKey: ["backends", key],
    queryFn: fetchFull,
    // Wait for the summary to settle so the phases never race; if the summary
    // failed we still try the full fetch rather than giving up.
    enabled: !summary.isPending,
    staleTime: refreshMs,
    refetchInterval: refreshMs,
  });

  return {
    // Full data supersedes the summary once it lands.
    data: full.data ?? summary.data,
    // Cards can render as soon as either phase has data.
    isLoading: summary.isPending && full.isPending,
    // True while the heavy details (qubit map, fidelities) are still loading.
    isLoadingDetails: full.isPending,
  };
}
