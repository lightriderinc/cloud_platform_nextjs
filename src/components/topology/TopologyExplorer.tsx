"use client";

import {
  DEFAULT_TOPOLOGY_BACKEND_ID,
  fetchCorridors,
  fetchEdges,
  fetchQubits,
  fetchTopologyStatus,
  type CorridorEntry,
  type QubitEntry,
  type TopologyEnvelope,
} from "@/lib/topology/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import CorridorRankingCard from "./CorridorRankingCard";
import ProcessorMapCard from "./ProcessorMapCard";
import TopologyDetailPanel from "./TopologyDetailPanel";
import TopologyExplorerSkeleton from "./TopologyExplorerSkeleton";
import TopologyScoringExplainer from "./TopologyScoringExplainer";
import TopologyStatCards from "./TopologyStatCards";
import TopologyTooltip from "./TopologyTooltip";
import type { Selection, TooltipState } from "./types";

// A poll's own processing takes a few seconds (lastPollAt and lastSuccessAt
// land within ~1s of each other in a healthy run) — anything beyond this
// tolerance between them means a poll actually ran and did not succeed,
// even before consecutiveFailures reflects it.
const POLL_DIVERGENCE_TOLERANCE_SECONDS = 60;

function chipletSortKey(chipletId: string): number {
  const n = parseInt(chipletId.replace(/^\D+/, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export default function TopologyExplorer({
  backendId = DEFAULT_TOPOLOGY_BACKEND_ID,
}: {
  backendId?: string;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const corridorsQuery = useQuery({
    queryKey: ["topology", "corridors", backendId],
    queryFn: () => fetchCorridors(backendId),
  });
  const qubitsQuery = useQuery({
    queryKey: ["topology", "qubits", backendId],
    queryFn: () => fetchQubits(backendId),
  });
  const edgesQuery = useQuery({
    queryKey: ["topology", "edges", backendId],
    queryFn: () => fetchEdges(backendId),
  });
  // Poller health is independent of the map/ranking data below — a failed
  // status fetch shouldn't block the rest of the page, so it's kept out of
  // isLoading/isError and handled on its own in the top strip.
  const statusQuery = useQuery({
    queryKey: ["topology", "status", backendId],
    queryFn: () => fetchTopologyStatus(backendId),
  });

  const isLoading = corridorsQuery.isLoading || qubitsQuery.isLoading || edgesQuery.isLoading;
  const isError = corridorsQuery.isError || qubitsQuery.isError || edgesQuery.isError;

  // Every endpoint's envelope describes the same underlying snapshot — any
  // one that's loaded is enough for the calibration-age stat, so no extra
  // call is made just for that.
  const envelope: TopologyEnvelope<unknown> | undefined =
    qubitsQuery.data ?? corridorsQuery.data ?? edgesQuery.data;

  // Poller health, not Rigetti's calibration age (envelope.snapshotAgeSeconds)
  // — deliberately kept separate. A stopped poller and a healthy one look
  // identical via calibration age alone (it just creeps up slowly either
  // way), so poller health needs its own signal.
  const pollStatus = statusQuery.data;
  // secondsSinceLastSuccess and pollIntervalSeconds both come straight from
  // the server, not computed from a captured client-side "now" against
  // lastSuccessAt — avoids client/server clock skew and a re-render-staleness
  // concern entirely.
  const lastPollAgoSeconds = pollStatus?.secondsSinceLastSuccess ?? null;
  const nextPollEtaSeconds = pollStatus
    ? Math.max(0, pollStatus.pollIntervalSeconds - pollStatus.secondsSinceLastSuccess)
    : null;
  // lastPollAt vs lastSuccessAt: identical while healthy, diverge the
  // moment a poll runs but fails — checked independently of
  // consecutiveFailures so this doesn't rely on a single counter being
  // right.
  const pollDiverged = pollStatus
    ? new Date(pollStatus.lastPollAt).getTime() - new Date(pollStatus.lastSuccessAt).getTime() >
      POLL_DIVERGENCE_TOLERANCE_SECONDS * 1000
    : false;
  // pollingEnabled is only sometimes present on this response — absence
  // means no signal either way, not "disabled", so this checks `=== false`
  // rather than negating a possibly-undefined value.
  const pollerUnhealthy = pollStatus
    ? pollStatus.consecutiveFailures > 0 || pollStatus.pollingEnabled === false || pollDiverged
    : false;

  const qubits = useMemo(() => qubitsQuery.data?.data ?? [], [qubitsQuery.data]);
  const edges = useMemo(() => edgesQuery.data?.data ?? [], [edgesQuery.data]);
  const corridors = corridorsQuery.data?.data;

  const qubitsByChiplet = useMemo(() => {
    const map = new Map<string, QubitEntry[]>();
    for (const q of qubits) {
      if (!q.chipletId) continue;
      const list = map.get(q.chipletId) ?? [];
      list.push(q);
      map.set(q.chipletId, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.qubitIndex - b.qubitIndex);
    return map;
  }, [qubits]);

  const chipletIds = useMemo(
    () => Array.from(qubitsByChiplet.keys()).sort((a, b) => chipletSortKey(a) - chipletSortKey(b)),
    [qubitsByChiplet],
  );

  const allCorridors = useMemo(
    () => [...(corridors?.ranked ?? []), ...(corridors?.unranked ?? [])],
    [corridors],
  );

  // Drives corridor color (map lines + ranking bars) — keyed to score, the
  // same number shown as "Score %" in the ranking table, so color always
  // matches what's displayed.
  const scoreRange = useMemo(() => {
    const values = allCorridors.map((c) => c.score).filter((v): v is number => v !== null);
    if (values.length === 0) return { lo: 0, hi: 1 };
    return { lo: Math.min(...values), hi: Math.max(...values) };
  }, [allCorridors]);

  // The top-strip answer: "best corridor" (composite score) and "best
  // coupler" (raw fCZ) are deliberately kept as two separate stats, since
  // they can name different corridors — that gap is the entire point of
  // scoring by mean x coverage instead of best-link alone.
  const topCorridor = corridors?.ranked[0] ?? null;
  const bestCoupler = useMemo(() => {
    let best: CorridorEntry | null = null;
    for (const c of allCorridors) {
      if (c.bestLinkFcz !== null && (!best || c.bestLinkFcz > (best.bestLinkFcz as number))) best = c;
    }
    return best;
  }, [allCorridors]);

  if (isError) {
    return <p className="text-sm text-red-500">Failed to load topology data. Try again later.</p>;
  }

  if (isLoading) {
    return <TopologyExplorerSkeleton />;
  }

  return (
    <div className="flex flex-col gap-4">
      <TopologyStatCards
        topCorridor={topCorridor}
        bestCoupler={bestCoupler}
        envelope={envelope}
        lastPollAgoSeconds={lastPollAgoSeconds}
        nextPollEtaSeconds={nextPollEtaSeconds}
        pollerUnhealthy={pollerUnhealthy}
        pollStatus={pollStatus}
      />

      {/* MAP + RANKING (left) / DETAIL (right, sticky — not below the fold) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <ProcessorMapCard
            allCorridors={allCorridors}
            chipletIds={chipletIds}
            qubitsByChiplet={qubitsByChiplet}
            scoreRange={scoreRange}
            onSelect={setSelection}
            onTooltip={setTooltip}
          />

          <CorridorRankingCard
            corridors={corridors}
            scoreRange={scoreRange}
            onSelect={setSelection}
          />

          <TopologyScoringExplainer />
        </div>

        <TopologyDetailPanel selection={selection} edges={edges} onSelect={setSelection} />
      </div>

      <TopologyTooltip tooltip={tooltip} />
    </div>
  );
}
