"use client";

import {
  DEFAULT_TOPOLOGY_BACKEND_ID,
  fetchCorridors,
  fetchEdges,
  fetchQubits,
  fetchTopologyStatus,
  type CorridorEntry,
  type EdgeEntry,
  type Metric,
  type MetricState,
  type QubitEntry,
  type TopologyEnvelope,
} from "@/lib/topology/client";
import {
  formatAgeShort,
  formatAgoShort,
  formatCalibrationShort,
  formatDurationNs,
  formatEtaShort,
  formatFidelityPct,
  formatMetricValue,
  formatScore,
  formatSeconds,
  stateLabel,
} from "@/lib/topology/format";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

// Layout choice (not data): 12 chiplets rendered 3-per-row, matching
// Cepheus's documented 3x4 modular array. Chiplet identity, membership, and
// every value below come from the live qubits/edges/corridors responses on
// every load — nothing here is a fixed lookup table of which chiplet holds
// which qubits.
const CHIPLET_GRID_COLS = 3;

// A poll's own processing takes a few seconds (lastPollAt and lastSuccessAt
// land within ~1s of each other in a healthy run) — anything beyond this
// tolerance between them means a poll actually ran and did not succeed,
// even before consecutiveFailures reflects it.
const POLL_DIVERGENCE_TOLERANCE_SECONDS = 60;

type Selection =
  | { kind: "qubit"; qubit: QubitEntry }
  | { kind: "edge"; edge: EdgeEntry }
  | { kind: "corridor"; corridor: CorridorEntry };

interface TooltipState {
  html: string;
  x: number;
  y: number;
}

function chipletSortKey(chipletId: string): number {
  const n = parseInt(chipletId.replace(/^\D+/, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

// Green/amber/red-ish semantics reused from JobStatusBadge's existing
// active/warning/failed convention elsewhere in this app, rather than
// inventing a new palette. Sentinel and absent get a dashed border — they
// are "unknown"/"not exposed", not points on the same quality scale.
const STATE_CLASSES: Record<MetricState, { badge: string; cell: string }> = {
  active: { badge: "bg-green-50 text-green-700 border-green-200", cell: "bg-green-500" },
  degraded: { badge: "bg-amber-50 text-amber-700 border-amber-200", cell: "bg-amber-400" },
  sentinel: {
    badge: "bg-purple-50 text-purple-700 border-purple-300 border-dashed",
    cell: "bg-purple-100 border-dashed border-purple-400",
  },
  absent: {
    badge: "bg-gray-50 text-gray-400 border-gray-200 border-dashed",
    cell: "bg-transparent border-dashed border-gray-300",
  },
};

function StateBadge({ state }: { state: MetricState }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${STATE_CLASSES[state].badge}`}
    >
      {stateLabel(state)}
    </span>
  );
}

// Interpolates green-200 -> green-600 across the live meanFcz range actually
// present (never a fixed guess baked in from a frozen snapshot).
function fczColor(value: number, lo: number, hi: number): string {
  const t = hi === lo ? 1 : Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
  const from = [187, 247, 208];
  const to = [22, 163, 74];
  const rgb = from.map((f, i) => Math.round(f + (to[i] - f) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

function MetricRow({
  label,
  metric,
  formatter,
}: {
  label: string;
  metric: Metric;
  formatter: (v: number | null) => string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-gray-100 py-2 text-sm last:border-0">
      <span className="font-medium text-gray-700">{label}</span>
      <StateBadge state={metric.state} />
      <span className="text-gray-900">{formatMetricValue(metric, formatter)}</span>
      <span className="text-xs text-gray-400">
        {metric.error === null ? "no error reported" : `± ${metric.error.toFixed(4)}`}
      </span>
    </div>
  );
}

function RawValuesBlock({ raw }: { raw: Record<string, unknown> }) {
  const empty = Object.keys(raw).length === 0;
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer font-medium text-gray-500">
        Raw vendor record{empty ? " (empty)" : ""}
      </summary>
      {!empty && (
        <>
          <p className="mt-1.5 text-gray-400">
            Informational only — a sentinel placeholder here (e.g. value 0.5, error 1.0) is the
            vendor&apos;s &ldquo;not measured&rdquo; marker, never a real fidelity.
          </p>
          <pre className="mt-1.5 overflow-x-auto rounded bg-gray-50 p-2 text-[11px]">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </>
      )}
    </details>
  );
}

function DetailPanel({
  selection,
  edges,
  onSelect,
}: {
  selection: Selection;
  edges: EdgeEntry[];
  onSelect: (s: Selection) => void;
}) {
  if (selection.kind === "qubit") {
    const q = selection.qubit;
    return (
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-base font-semibold text-gray-900">Qubit q{q.qubitIndex}</span>
          <StateBadge state={q.presence} />
        </div>
        <p className="mb-2 text-xs text-gray-500">Chiplet {q.chipletId ?? "—"}</p>
        <MetricRow label="T1" metric={q.t1} formatter={formatSeconds} />
        <MetricRow label="T2" metric={q.t2} formatter={formatSeconds} />
        <MetricRow label="Readout fidelity" metric={q.readout} formatter={formatFidelityPct} />
        <MetricRow label="fRB — isolated (driven alone)" metric={q.frbIsolated} formatter={formatFidelityPct} />
        <MetricRow
          label="fRB — simultaneous (all 107, incl. crosstalk)"
          metric={q.frbSimultaneous}
          formatter={formatFidelityPct}
        />
        <p className="mt-2 text-xs text-gray-500">RX gate duration: {formatDurationNs(q.rxDurationNs)}</p>
        <p className="text-xs text-gray-500">Calibration pulse present: {q.hasCalibration ? "yes" : "no"}</p>
        <RawValuesBlock raw={q.rawValues} />
      </div>
    );
  }

  if (selection.kind === "edge") {
    const e = selection.edge;
    return (
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-base font-semibold text-gray-900">
            Coupler q{e.nodeA}–q{e.nodeB}
          </span>
          <StateBadge state={e.presence} />
        </div>
        <p className="mb-2 text-xs text-gray-500">
          {e.chipletA} → {e.chipletB}
          {e.corridorId ? ` · corridor ${e.corridorId}` : " · intra-chiplet (no corridor)"}
        </p>
        <MetricRow label="CZ fidelity" metric={e.cz} formatter={formatFidelityPct} />
        <p className="mt-2 text-xs text-gray-500">CZ gate duration: {formatDurationNs(e.czDurationNs)}</p>
        <p className="text-xs text-gray-500">
          Calibration pulse present: {e.hasCalibration ? "yes" : "no"}
          {e.cz.state === "sentinel" && e.hasCalibration
            ? " — evidence it's unmeasured, not broken."
            : ""}
        </p>
        <RawValuesBlock raw={e.rawValues} />
      </div>
    );
  }

  const c = selection.corridor;
  const isUnranked = c.score === null;
  const constituentEdges = edges.filter((e) => e.corridorId === c.corridorId);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-base font-semibold text-gray-900">Corridor {c.corridorId}</span>
        {isUnranked && <StateBadge state="sentinel" />}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">
        <span className="text-gray-500">Coverage</span>
        <span className="text-gray-900">
          {c.validLinks}/{c.expectedLinks} links ({(c.coverage * 100).toFixed(0)}%)
        </span>
        <span className="text-gray-500">Mean CZ fidelity</span>
        <span className="text-gray-900">{formatFidelityPct(c.meanFcz)}</span>
        <span className="text-gray-500">Best link fCZ (marker only)</span>
        <span className="text-gray-900">
          {formatFidelityPct(c.bestLinkFcz)}
          {c.bestLink ? ` (q${c.bestLink[0]}–q${c.bestLink[1]})` : ""}
        </span>
        <span className="text-gray-500">Score (mean fCZ × coverage)</span>
        <span className="text-gray-900">{formatScore(c.score)}</span>
      </div>
      {c.sentinelLinks > 0 && (
        <p className="mt-2 text-xs text-purple-700">
          {c.sentinelLinks} of {c.expectedLinks} links uncharacterized (sentinel) — unmeasured, not
          bad.
        </p>
      )}
      {c.missingLinks > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          {c.missingLinks} of {c.expectedLinks} expected links not present in the ISA at all.
        </p>
      )}
      {constituentEdges.length > 0 && (
        <>
          <p className="mt-3 mb-1 text-xs font-medium text-gray-500">Individual couplers</p>
          <div className="flex flex-col gap-1">
            {constituentEdges.map((e) => (
              <button
                key={`${e.nodeA}-${e.nodeB}`}
                type="button"
                onClick={() => onSelect({ kind: "edge", edge: e })}
                className="flex items-center justify-between rounded border border-gray-100 px-2 py-1 text-left text-xs hover:border-gray-300"
              >
                <span>
                  q{e.nodeA}–q{e.nodeB}
                </span>
                <StateBadge state={e.cz.state} />
                <span>{formatMetricValue(e.cz, formatFidelityPct)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RankRow({ corridor, onSelect }: { corridor: CorridorEntry; onSelect: (s: Selection) => void }) {
  const barPct = corridor.score === null ? 0 : Math.max(1, corridor.score * 100);
  const tickPct = corridor.bestLinkFcz === null ? null : corridor.bestLinkFcz * 100;
  return (
    <button
      type="button"
      onClick={() => onSelect({ kind: "corridor", corridor })}
      className="grid w-full grid-cols-[64px_1fr_64px_44px_120px] items-center gap-3 rounded px-1 py-1 text-left hover:bg-gray-50"
    >
      <span className="text-sm font-medium text-gray-800">{corridor.corridorId}</span>
      <span className="relative h-3.5 overflow-hidden rounded bg-gray-100">
        <span
          className="absolute inset-y-0 left-0 rounded bg-green-500"
          style={{ width: `${barPct}%` }}
        />
        {tickPct !== null && (
          <span className="absolute inset-y-0 w-0.5 bg-gray-700" style={{ left: `${tickPct}%` }} />
        )}
      </span>
      <span className="text-right text-sm font-medium text-gray-900">
        {corridor.score === null ? "not measured" : `${(corridor.score * 100).toFixed(2)}%`}
      </span>
      <span className="text-right text-xs text-gray-400">
        {corridor.validLinks}/{corridor.expectedLinks}
      </span>
      <span className="text-right text-xs text-gray-400">
        {corridor.bestLink ? `q${corridor.bestLink[0]}-q${corridor.bestLink[1]} ` : ""}
        {formatFidelityPct(corridor.bestLinkFcz, 2)}
      </span>
    </button>
  );
}

export default function TopologyExplorer({
  backendId = DEFAULT_TOPOLOGY_BACKEND_ID,
}: {
  backendId?: string;
}) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  const fczRange = useMemo(() => {
    const values = allCorridors.map((c) => c.meanFcz).filter((v): v is number => v !== null);
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

  function drawCorridors() {
    const svg = svgRef.current;
    const wrap = mapWrapRef.current;
    if (!svg || !wrap) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const wrapRect = wrap.getBoundingClientRect();
    svg.setAttribute("width", String(wrapRect.width));
    svg.setAttribute("height", String(wrapRect.height));
    svg.setAttribute("viewBox", `0 0 ${wrapRect.width} ${wrapRect.height}`);

    for (const corridor of allCorridors) {
      const [aId, bId] = corridor.corridorId.split("-");
      const elA = document.getElementById(`chip-${aId}`);
      const elB = document.getElementById(`chip-${bId}`);
      if (!elA || !elB) continue;
      const ra = elA.getBoundingClientRect();
      const rb = elB.getBoundingClientRect();
      const ax = ra.left - wrapRect.left + ra.width / 2;
      const ay = ra.top - wrapRect.top + ra.height / 2;
      const bx = rb.left - wrapRect.left + rb.width / 2;
      const by = rb.top - wrapRect.top + rb.height / 2;
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const pullX = (ra.width / 2 - 2) * (dx / len);
      const pullY = (ra.height / 2 - 2) * (dy / len);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(ax + pullX));
      line.setAttribute("y1", String(ay + pullY));
      line.setAttribute("x2", String(bx - pullX));
      line.setAttribute("y2", String(by - pullY));
      line.setAttribute(
        "stroke-width",
        corridor.score === null ? "3" : String(1.5 + corridor.coverage * 2.5),
      );
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute(
        "stroke",
        corridor.meanFcz === null ? "#a78bfa" : fczColor(corridor.meanFcz, fczRange.lo, fczRange.hi),
      );
      if (corridor.score !== null && corridor.coverage < 1) {
        line.setAttribute("stroke-dasharray", "5 3");
      }
      line.style.cursor = "pointer";
      line.setAttribute("pointer-events", "stroke");
      line.addEventListener("click", () => setSelection({ kind: "corridor", corridor }));
      line.addEventListener("mouseenter", (evt) => {
        const html =
          corridor.score === null
            ? `<b>${corridor.corridorId} — uncharacterized</b>${corridor.sentinelLinks}/${corridor.expectedLinks} links sentinel.`
            : `<b>${corridor.corridorId}</b>score ${formatScore(corridor.score, 3)} · mean fCZ ${formatFidelityPct(corridor.meanFcz, 2)} · ${corridor.validLinks}/${corridor.expectedLinks}`;
        setTooltip({ html, x: (evt as MouseEvent).clientX + 12, y: (evt as MouseEvent).clientY + 12 });
      });
      line.addEventListener("mousemove", (evt) => {
        setTooltip((t) =>
          t ? { ...t, x: (evt as MouseEvent).clientX + 12, y: (evt as MouseEvent).clientY + 12 } : t,
        );
      });
      line.addEventListener("mouseleave", () => setTooltip(null));
      svg.appendChild(line);
    }
  }

  useEffect(() => {
    drawCorridors();
    function onResize() {
      drawCorridors();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCorridors, chipletIds]);

  if (isError) {
    return <p className="text-sm text-red-500">Failed to load topology data. Try again later.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* TOP STRIP — the answer, most important element on the page. */}
      <div className="grid grid-cols-2 gap-4 default-radius border border-gray-100 bg-white p-4 sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Best corridor</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-900">{topCorridor?.corridorId ?? "—"}</p>
          <p className="text-xs text-gray-500">
            {topCorridor ? `score ${(topCorridor.score as number * 100).toFixed(2)}%` : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Best coupler</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-900">
            {bestCoupler?.bestLink ? `q${bestCoupler.bestLink[0]}-q${bestCoupler.bestLink[1]}` : "—"}
          </p>
          <p className="text-xs text-gray-500">
            {bestCoupler ? `${formatFidelityPct(bestCoupler.bestLinkFcz, 2)} fCZ` : "—"}
          </p>
        </div>
        <div>
          {/* Rigetti's calibration age — not ours. See "Last poll" below for
              our own poller's health; the two answer different questions. */}
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Calibration</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-900">
            {envelope ? formatAgeShort(envelope.snapshotAgeSeconds) : "—"}
          </p>
          <p className="text-xs text-gray-500">
            {envelope ? `Rigetti's data · ${formatCalibrationShort(envelope.calibrationId)}` : "—"}
          </p>
          {envelope?.isStale && (
            <span className="mt-1 inline-block rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
              Stale snapshot
            </span>
          )}
        </div>
        <div>
          {/* Our own poller. A stopped poller looks identical to a healthy
              one via calibration age alone — this is the actual signal. */}
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Last poll</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-900">
            {lastPollAgoSeconds !== null ? formatAgoShort(lastPollAgoSeconds) : "—"}
          </p>
          <p className="text-xs text-gray-500">
            {nextPollEtaSeconds !== null ? formatEtaShort(nextPollEtaSeconds) : "—"}
          </p>
          {pollerUnhealthy && (
            <span
              className="mt-1 inline-block cursor-help rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600"
              title={
                pollStatus?.lastError
                  ? pollStatus.lastError
                  : pollStatus?.pollingEnabled === false
                    ? "Polling is disabled"
                    : "Poll ran but did not succeed — no error message recorded"
              }
            >
              {pollStatus?.pollingEnabled === false ? "Polling disabled" : "Poll failures"}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Provenance</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-900">
            {envelope?.topologyProvenance ?? "—"}
          </p>
        </div>
      </div>

      {/* MAP + RANKING (left) / DETAIL (right, sticky — not below the fold) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="default-radius border border-gray-100 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-700">Processor map</h2>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-green-500" />
                  Active
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                  Degraded
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-purple-400 bg-purple-100" />
                  Sentinel (unmeasured)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-gray-300" />
                  Absent
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                Loading topology…
              </div>
            ) : (
              <div className="relative mx-auto max-w-md" ref={mapWrapRef}>
                <svg ref={svgRef} className="absolute inset-0 h-full w-full overflow-visible" style={{ pointerEvents: "none" }} />
                <div
                  className="relative grid gap-4 p-3"
                  style={{ gridTemplateColumns: `repeat(${CHIPLET_GRID_COLS}, 1fr)` }}
                >
                  {chipletIds.map((chipletId) => {
                    const chipletQubits = qubitsByChiplet.get(chipletId) ?? [];
                    const activeCount = chipletQubits.filter((q) => q.presence !== "absent").length;
                    return (
                      <div
                        key={chipletId}
                        id={`chip-${chipletId}`}
                        className="relative z-10 cursor-pointer rounded border border-gray-200 bg-white p-1.5 hover:border-gray-400"
                        onClick={() =>
                          chipletQubits[0] && setSelection({ kind: "qubit", qubit: chipletQubits[0] })
                        }
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-gray-700">{chipletId}</span>
                          <span className="text-[9px] text-gray-400">
                            {activeCount}/{chipletQubits.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-0.5">
                          {chipletQubits.map((q) => (
                            <div
                              key={q.qubitIndex}
                              className={`aspect-square rounded-sm border border-gray-200 ${
                                q.presence === "absent"
                                  ? STATE_CLASSES.absent.cell
                                  : STATE_CLASSES[q.frbSimultaneous.state].cell
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelection({ kind: "qubit", qubit: q });
                              }}
                              onMouseEnter={(e) => {
                                const html =
                                  q.presence === "absent"
                                    ? `<b>q${q.qubitIndex} — ABSENT</b>Not exposed in the ISA.`
                                    : `<b>q${q.qubitIndex}</b>fRB (simultaneous): ${formatMetricValue(q.frbSimultaneous, formatFidelityPct)}`;
                                setTooltip({ html, x: e.clientX + 12, y: e.clientY + 12 });
                              }}
                              onMouseMove={(e) =>
                                setTooltip((t) => (t ? { ...t, x: e.clientX + 12, y: e.clientY + 12 } : t))
                              }
                              onMouseLeave={() => setTooltip(null)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="default-radius border border-gray-100 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-700">
              Corridor ranking — score (mean fCZ × coverage)
            </h2>
            {isLoading ? (
              <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                Loading corridors…
              </div>
            ) : (
              corridors && (
                <>
                  <div className="grid grid-cols-[64px_1fr_64px_44px_120px] gap-3 border-b border-gray-100 pb-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                    <span>Corridor</span>
                    <span>Score</span>
                    <span className="text-right">Score %</span>
                    <span className="text-right">Cov.</span>
                    <span className="text-right">Best link</span>
                  </div>
                  <div className="flex flex-col divide-y divide-gray-50">
                    {corridors.ranked.map((c) => (
                      <RankRow key={c.corridorId} corridor={c} onSelect={setSelection} />
                    ))}
                  </div>

                  {corridors.unranked.length > 0 && (
                    <div className="mt-4 rounded border border-dashed border-purple-300 bg-purple-50/40 p-3">
                      <p className="mb-2 text-xs font-medium text-purple-700">
                        Uncharacterized corridors — excluded from ranking, not the bottom of it
                      </p>
                      {corridors.unranked.map((c) => (
                        <button
                          key={c.corridorId}
                          type="button"
                          onClick={() => setSelection({ kind: "corridor", corridor: c })}
                          className="flex w-full items-center justify-between gap-3 rounded px-1 py-1 text-left hover:bg-purple-50"
                        >
                          <span className="text-sm font-medium text-gray-800">{c.corridorId}</span>
                          <span className="text-xs text-gray-500">not measured</span>
                          <span className="text-xs text-gray-500">
                            {c.validLinks}/{c.expectedLinks}
                          </span>
                          <span className="text-xs text-purple-700">
                            {c.sentinelLinks} link(s) sentinel — unmeasured, not blocked
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )
            )}
          </div>

          <details className="default-radius border border-gray-100 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-700">
              How this is scored
            </summary>
            <div className="mt-2 flex flex-col gap-2 text-xs text-gray-600">
              <p>
                Corridor score = mean CZ fidelity × coverage (valid links / expected links).
                Coverage-weighting is deliberate: a corridor with one excellent link and two
                sentinels must not outrank one with three good links.
              </p>
              <p>
                Best-link fidelity is shown as a secondary marker only — never as the sort key.
                &ldquo;Best coupler&rdquo; in the top strip and &ldquo;best corridor&rdquo; can
                legitimately name different corridors; that gap is the reason for scoring this
                way rather than by best link alone.
              </p>
              <p>
                A sentinel record means uncharacterized, not bad — it is never treated as low
                quality or sorted among genuinely poor hardware. The chiplet mapping
                (C1–C{chipletIds.length || 12}) is Light Rider&apos;s reconstruction from observed
                ISA connectivity, not Rigetti&apos;s official die numbering.
              </p>
            </div>
          </details>
        </div>

        {/* DETAIL PANEL — sticky, always visible, not below the fold. */}
        <aside className="default-radius border border-gray-100 bg-white p-4 lg:sticky lg:top-4 lg:self-start">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Detail</h2>
          {selection ? (
            <DetailPanel selection={selection} edges={edges} onSelect={setSelection} />
          ) : (
            <p className="text-sm text-gray-400">
              Click a chiplet, qubit, or corridor to see its full detail here.
            </p>
          )}
        </aside>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 max-w-[280px] rounded bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y, pointerEvents: "none" }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}
    </div>
  );
}
