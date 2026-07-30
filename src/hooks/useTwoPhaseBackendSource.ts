"use client";

import { useQuery } from "@tanstack/react-query";
import type { Backend } from "@/types/backend";

const FIVE_MINUTES = 5 * 60 * 1000;

// Two-phase variant of useBackendSource for providers whose card data is much
// cheaper than their full calibration payload. The summary query paints the
// catalog cards as fast as possible; once it settles, the full query fetches
// the heavy details (fidelities, qubit map) behind the scenes and replaces
// it. Only the full query polls - the summary is just a stepping stone.
//
// `enabled: false` disables both phases entirely via React Query's own
// option (no queryFn ever runs) - used to gate off a provider's live fetch
// without touching its fetch logic at all (see useIbmBackends).
export function useTwoPhaseBackendSource(
  key: string,
  fetchSummary: () => Promise<Backend[]>,
  fetchFull: () => Promise<Backend[]>,
  refreshMs: number = FIVE_MINUTES,
  enabled: boolean = true,
) {
  const summary = useQuery({
    queryKey: ["backends", key, "summary"],
    queryFn: fetchSummary,
    staleTime: refreshMs,
    enabled,
  });

  const full = useQuery({
    queryKey: ["backends", key],
    queryFn: fetchFull,
    // Wait for the summary to settle so the phases never race; if the summary
    // failed we still try the full fetch rather than giving up.
    enabled: enabled && !summary.isPending,
    staleTime: refreshMs,
    refetchInterval: refreshMs,
  });

  return {
    // Full data supersedes the summary once it lands.
    data: full.data ?? summary.data,
    // Cards can render as soon as either phase has data. When disabled,
    // neither query ever settles (React Query leaves them "pending"
    // indefinitely), so `enabled` gates this directly rather than reporting
    // a permanent loading state for a source that was never asked to load.
    isLoading: enabled && summary.isPending && full.isPending,
    // True while the heavy details (qubit map, fidelities) are still loading.
    isLoadingDetails: enabled && full.isPending,
  };
}
