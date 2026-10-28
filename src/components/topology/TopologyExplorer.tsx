"use client";

import {
  DEFAULT_TOPOLOGY_BACKEND_ID,
  fetchCorridors,
  fetchEdges,
  fetchQubits,
  fetchTopologyStatus,
  type EdgeEntry,
  type QubitEntry,
  type TopologyEnvelope,
} from "@/lib/topology/client";
import { summarizeChiplets } from "@/lib/topology/chipletSummary";
import { orderChipletsByPosition } from "@/lib/topology/layout";
import { couplerBand, type AgeReference } from "@/lib/topology/thresholds";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import CorridorRankingCard from "./CorridorRankingCard";
import { clampedRange } from "./errorGradient";
import ProcessorMapCard from "./ProcessorMapCard";
import SnapshotExport from "./SnapshotExport";
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
  // Same snapshot for every endpoint, so one reference dates every metric.
  const ageRef = useMemo<AgeReference | null>(
    () =>
      envelope
        ? { sourceTimestamp: envelope.sourceTimestamp, snapshotAgeSeconds: envelope.snapshotAgeSeconds }
        : null,
    [envelope],
  );

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

  const qubits = useMemo(() => qubitsQuery.data?.data.qubits ?? [], [qubitsQuery.data]);
  const lattice = qubitsQuery.data?.data.lattice ?? null;
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

  // Physical order (row-major by chiplet block) when the snapshot carries
  // lattice positions; numeric id order otherwise.
  const chipletIds = useMemo(
    () =>
      orderChipletsByPosition(qubitsByChiplet, lattice) ??
      Array.from(qubitsByChiplet.keys()).sort((a, b) => chipletSortKey(a) - chipletSortKey(b)),
    [qubitsByChiplet, lattice],
  );

  // One pass over the qubits/edges already fetched — the chiplet card reads
  // from this, nothing is re-fetched.
  const chipletSummaries = useMemo(() => summarizeChiplets(qubits, edges), [qubits, edges]);

  const allCorridors = useMemo(
    () => [...(corridors?.ranked ?? []), ...(corridors?.unranked ?? [])],
    [corridors],
  );

  // Drives corridor color (map lines + ranking bars) — keyed to score, the
  // same number shown as "Score %" in the ranking table, so color always
  // matches what's displayed.
  // Clamped to the 5th–95th percentile like the qubit colors, so one outlier
  // corridor doesn't flatten the rest; scoreColor already pins beyond-range
  // scores to the end color. Unscored corridors are never part of it.
  const scoreRange = useMemo(() => {
    const range = clampedRange(allCorridors.map((c) => c.score).filter((v): v is number => v !== null));
    if (!range) return { lo: 0, hi: 1 };
    return { lo: range.min, hi: range.max };
  }, [allCorridors]);

  // The top-strip answer: "best chiplet link" (composite score) and "best
  // coupler" (lowest CZ error) are deliberately separate stats, since the
  // best single coupler need not sit on the best link. That gap is the point
  // of scoring links by mean x coverage instead of by their best coupler.
  const topCorridor = corridors?.ranked[0] ?? null;
  // Best over ALL measured couplers, inside chiplets and between them (the
  // corridors' bestLink only covers between-chiplet couplers).
  const bestCoupler = useMemo(() => {
    let best: EdgeEntry | null = null;
    for (const e of edges) {
      if (couplerBand(e) === "uncalibrated") continue;
      if (!best || (e.cz.value as number) > (best.cz.value as number)) best = e;
    }
    return best;
  }, [edges]);

  if (isError) {
    return <p className="text-sm text-red-500">Couldn&apos;t load the processor map. Try again later.</p>;
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
            edges={edges}
            chipletIds={chipletIds}
            qubitsByChiplet={qubitsByChiplet}
            lattice={lattice}
            scoreRange={scoreRange}
            selection={selection}
            ageRef={ageRef}
            layoutConfirmed={envelope?.topologyProvenance !== "inferred"}
            actions={
              qubitsQuery.data && <SnapshotExport qubitsEnvelope={qubitsQuery.data} edges={edges} />
            }
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

        <TopologyDetailPanel
          selection={selection}
          edges={edges}
          chipletSummaries={chipletSummaries}
          ageRef={ageRef}
          onSelect={setSelection}
        />
      </div>

      <TopologyTooltip tooltip={tooltip} />
    </div>
  );
}
