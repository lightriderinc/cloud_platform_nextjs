"use client";

import {
  DEFAULT_TOPOLOGY_BACKEND_ID,
  fetchCorridors,
  fetchEdges,
  fetchQubits,
  type CorridorEntry,
  type EdgeEntry,
  type Metric,
  type MetricState,
  type QubitEntry,
  type TopologyEnvelope,
} from "@/lib/topology/client";
import {
  formatDurationNs,
  formatFidelityPct,
  formatMetricValue,
  formatScore,
  formatSeconds,
  stateLabel,
} from "@/lib/topology/format";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

// Layout choices (not data): 12 chiplets rendered 3-per-row, each a 3x3
// qubit mini-grid — matches Cepheus's documented 3x4 modular array. Chiplet
// identity, membership, and every value below come from the live qubits/
// edges/corridors responses on every load; nothing here is a fixed lookup
// table of which chiplet holds which qubits, unlike the frozen mockup.
const CHIPLET_GRID_COLS = 3;

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

function stateSwatchClass(state: MetricState): string {
  switch (state) {
    case "active":
      return "swatch-active";
    case "degraded":
      return "swatch-degraded";
    case "sentinel":
      return "swatch-sentinel";
    case "absent":
      return "swatch-absent";
  }
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
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      <span className={`metric-state ${stateSwatchClass(metric.state)}`}>{stateLabel(metric.state)}</span>
      <span className="metric-value">{formatMetricValue(metric, formatter)}</span>
      <span className="metric-error">
        {metric.error === null ? "no error reported" : `± ${metric.error.toFixed(4)}`}
      </span>
    </div>
  );
}

function RawValuesBlock({ raw }: { raw: Record<string, unknown> }) {
  const empty = Object.keys(raw).length === 0;
  return (
    <details className="raw-values">
      <summary>Raw vendor record{empty ? " (empty)" : ""}</summary>
      {!empty && (
        <>
          <p className="raw-values-note">
            Informational only — a sentinel placeholder here (e.g. value 0.5, error 1.0) is the
            vendor&apos;s &ldquo;not measured&rdquo; marker, never a real fidelity.
          </p>
          <pre>{JSON.stringify(raw, null, 2)}</pre>
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
      <div className="detail-panel">
        <div className="detail-head">
          <span className="detail-title">Qubit q{q.qubitIndex}</span>
          <span className={`metric-state ${stateSwatchClass(q.presence)}`}>
            {stateLabel(q.presence)}
          </span>
        </div>
        <p className="detail-sub">Chiplet {q.chipletId ?? "—"}</p>
        <MetricRow label="T1" metric={q.t1} formatter={formatSeconds} />
        <MetricRow label="T2" metric={q.t2} formatter={formatSeconds} />
        <MetricRow label="Readout fidelity" metric={q.readout} formatter={formatFidelityPct} />
        <MetricRow
          label="fRB — isolated (driven alone)"
          metric={q.frbIsolated}
          formatter={formatFidelityPct}
        />
        <MetricRow
          label="fRB — simultaneous (all 107, incl. crosstalk — the honest figure for real circuits)"
          metric={q.frbSimultaneous}
          formatter={formatFidelityPct}
        />
        <div className="metric-row">
          <span className="metric-label">RX gate duration</span>
          <span />
          <span className="metric-value">{formatDurationNs(q.rxDurationNs)}</span>
          <span />
        </div>
        <p className="detail-sub">Calibration pulse present: {q.hasCalibration ? "yes" : "no"}</p>
        <RawValuesBlock raw={q.rawValues} />
      </div>
    );
  }

  if (selection.kind === "edge") {
    const e = selection.edge;
    return (
      <div className="detail-panel">
        <div className="detail-head">
          <span className="detail-title">
            Coupler q{e.nodeA}–q{e.nodeB}
          </span>
          <span className={`metric-state ${stateSwatchClass(e.presence)}`}>
            {stateLabel(e.presence)}
          </span>
        </div>
        <p className="detail-sub">
          {e.chipletA} → {e.chipletB}
          {e.corridorId ? ` · corridor ${e.corridorId}` : " · intra-chiplet (no corridor)"}
        </p>
        <MetricRow label="CZ fidelity" metric={e.cz} formatter={formatFidelityPct} />
        <div className="metric-row">
          <span className="metric-label">CZ gate duration</span>
          <span />
          <span className="metric-value">{formatDurationNs(e.czDurationNs)}</span>
          <span />
        </div>
        <p className="detail-sub">
          Calibration pulse present: {e.hasCalibration ? "yes" : "no"}
          {e.cz.state === "sentinel" && e.hasCalibration
            ? " — a tuned pulse exists on an uncharacterized coupler; evidence it's unmeasured, not broken."
            : ""}
        </p>
        <RawValuesBlock raw={e.rawValues} />
      </div>
    );
  }

  const c = selection.corridor;
  const isUnranked = c.score === null;
  return (
    <div className="detail-panel">
      <div className="detail-head">
        <span className="detail-title">Corridor {c.corridorId}</span>
        {isUnranked && <span className="metric-state swatch-sentinel">Uncharacterized</span>}
      </div>
      <div className="metric-row">
        <span className="metric-label">Coverage</span>
        <span />
        <span className="metric-value">
          {c.validLinks}/{c.expectedLinks} links ({(c.coverage * 100).toFixed(0)}%)
        </span>
        <span />
      </div>
      <div className="metric-row">
        <span className="metric-label">Mean CZ fidelity</span>
        <span />
        <span className="metric-value">{formatFidelityPct(c.meanFcz)}</span>
        <span />
      </div>
      <div className="metric-row">
        <span className="metric-label">Best link fCZ (marker only)</span>
        <span />
        <span className="metric-value">
          {formatFidelityPct(c.bestLinkFcz)}
          {c.bestLink ? ` (q${c.bestLink[0]}–q${c.bestLink[1]})` : ""}
        </span>
        <span />
      </div>
      <div className="metric-row">
        <span className="metric-label">Corridor score (mean fCZ × coverage)</span>
        <span />
        <span className="metric-value">{formatScore(c.score)}</span>
        <span />
      </div>
      {c.sentinelLinks > 0 && (
        <p className="detail-sub">
          {c.sentinelLinks} of {c.expectedLinks} links uncharacterized (sentinel) — unmeasured, not
          bad.
        </p>
      )}
      {c.missingLinks > 0 && (
        <p className="detail-sub">
          {c.missingLinks} of {c.expectedLinks} expected links not present in the ISA at all —
          distinct from sentinel.
        </p>
      )}
      <p className="detail-sub" style={{ marginTop: 12 }}>
        Individual couplers in this corridor — click one for its own detail:
      </p>
      <div className="corridor-edge-list">
        {edges
          .filter((e) => e.corridorId === c.corridorId)
          .map((e) => (
            <button
              key={`${e.nodeA}-${e.nodeB}`}
              type="button"
              className="corridor-edge-item"
              onClick={() => onSelect({ kind: "edge", edge: e })}
            >
              <span>
                q{e.nodeA}–q{e.nodeB}
              </span>
              <span className={`metric-state ${stateSwatchClass(e.cz.state)}`}>
                {stateLabel(e.cz.state)}
              </span>
              <span>{formatMetricValue(e.cz, formatFidelityPct)}</span>
            </button>
          ))}
      </div>
    </div>
  );
}

export default function TopologyExplorer({
  backendId = DEFAULT_TOPOLOGY_BACKEND_ID,
}: {
  backendId?: string;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [colorMode, setColorMode] = useState<"quality" | "coverage">("quality");
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

  const isLoading = corridorsQuery.isLoading || qubitsQuery.isLoading || edgesQuery.isLoading;
  const isError = corridorsQuery.isError || qubitsQuery.isError || edgesQuery.isError;

  // Every endpoint's envelope describes the same underlying snapshot — any
  // one that's loaded is enough for the freshness/provenance banner, so no
  // separate /topology/status call is made just for this.
  const envelope: TopologyEnvelope<unknown> | undefined =
    qubitsQuery.data ?? corridorsQuery.data ?? edgesQuery.data;

  // useMemo (not a plain `?? []` fallback) so the empty-array case is a
  // stable reference across renders, not a fresh literal each time — the
  // dependency arrays below rely on that stability.
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

  // Color scale range derived from the live data actually present, not a
  // fixed guess baked in from the mockup's frozen snapshot.
  const fczRange = useMemo(() => {
    const values = allCorridors.map((c) => c.meanFcz).filter((v): v is number => v !== null);
    if (values.length === 0) return { lo: 0, hi: 1 };
    return { lo: Math.min(...values), hi: Math.max(...values) };
  }, [allCorridors]);

  function corridorColor(c: CorridorEntry): string {
    if (c.score === null) return "var(--series-7)"; // uncharacterized
    if (colorMode === "coverage") {
      if (c.coverage >= 1) return "var(--series-1-450)";
      if (c.coverage >= 2 / 3) return "var(--status-warning)";
      return "var(--status-critical)";
    }
    const { lo, hi } = fczRange;
    const t = hi === lo ? 1 : Math.max(0, Math.min(1, ((c.meanFcz as number) - lo) / (hi - lo)));
    const steps = [250, 300, 350, 400, 450, 500, 550, 600];
    const idx = Math.round(t * (steps.length - 1));
    return `var(--series-1-${steps[idx]})`;
  }

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
      const pullX = (ra.width / 2 - 4) * (dx / len);
      const pullY = (ra.height / 2 - 4) * (dy / len);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(ax + pullX));
      line.setAttribute("y1", String(ay + pullY));
      line.setAttribute("x2", String(bx - pullX));
      line.setAttribute("y2", String(by - pullY));
      line.setAttribute("stroke-width", corridor.score === null ? "8" : String(4 + corridor.coverage * 4));
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("stroke", corridorColor(corridor));
      if (corridor.score !== null && corridor.coverage < 1) {
        line.setAttribute("stroke-dasharray", "10 6");
      }
      line.style.cursor = "pointer";
      line.setAttribute("pointer-events", "stroke");
      line.addEventListener("click", () => setSelection({ kind: "corridor", corridor }));
      line.addEventListener("mouseenter", (evt) => {
        const html = corridor.score === null
          ? `<b>${corridor.corridorId} — uncharacterized</b>${corridor.sentinelLinks}/${corridor.expectedLinks} links sentinel. Not blocked — measurement pending.`
          : `<b>${corridor.corridorId}</b>Mean fCZ ${formatFidelityPct(corridor.meanFcz)} · coverage ${corridor.validLinks}/${corridor.expectedLinks} · score ${formatScore(corridor.score)}`;
        setTooltip({ html, x: (evt as MouseEvent).clientX + 14, y: (evt as MouseEvent).clientY + 14 });
      });
      line.addEventListener("mousemove", (evt) => {
        setTooltip((t) => (t ? { ...t, x: (evt as MouseEvent).clientX + 14, y: (evt as MouseEvent).clientY + 14 } : t));
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
  }, [allCorridors, colorMode, chipletIds, theme]);

  if (isError) {
    return (
      <p className="text-sm text-red-500">
        Failed to load topology data. Try again later.
      </p>
    );
  }

  return (
    <div className="viz-topology" data-theme={theme}>
      <div className="header">
        <div className="header-row">
          <div>
            <div className="title">{backendId} — Chiplet Topology &amp; Status</div>
            {envelope && (
              <div className="subtitle">
                Snapshot {envelope.calibrationId.slice(0, 18)}… ·{" "}
                {new Date(envelope.sourceTimestamp).toLocaleString()} ·{" "}
                {Math.round(envelope.snapshotAgeSeconds / 60)} min old
              </div>
            )}
          </div>
          <div className="badges">
            {envelope?.isStale && <span className="badge stale">Stale snapshot</span>}
            {envelope && (
              <span className="badge provenance">
                Topology provenance: {envelope.topologyProvenance}
              </span>
            )}
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            >
              Toggle dark mode
            </button>
          </div>
        </div>
        {envelope?.topologyProvenance === "inferred" && (
          <p className="provenance-note">
            The chiplet mapping (C1–C{chipletIds.length || 12}) is Light Rider&apos;s reconstruction
            from observed ISA connectivity, not Rigetti&apos;s official die numbering. Treat as
            inferred until vendor-confirmed.
          </p>
        )}
      </div>

      <div className="panel">
        <h2>Qubit &amp; edge state key</h2>
        <p className="desc">
          A sentinel record means uncharacterized, not bad, and is never rendered as low quality.
        </p>
        <div className="legend-row">
          <span className="legend-item">
            <span className="swatch swatch-active" />ACTIVE — normal, in service
          </span>
          <span className="legend-item">
            <span className="swatch swatch-degraded" />DEGRADED — measured, below threshold
          </span>
          <span className="legend-item">
            <span className="swatch swatch-sentinel" />SENTINEL — uncharacterized (unknown, not bad)
          </span>
          <span className="legend-item">
            <span className="swatch swatch-absent" />ABSENT — not exposed in the ISA
          </span>
        </div>
      </div>

      <div className="panel">
        <h2>Processor map</h2>
        <p className="desc">
          Connector color/weight encodes the corridor&apos;s mean CZ fidelity across all its links,
          not just its best coupler. Click a chiplet, qubit, or connector for full detail.
        </p>
        <div className="map-controls">
          <button
            type="button"
            className="ctrl-btn"
            aria-pressed={colorMode === "quality"}
            onClick={() => setColorMode("quality")}
          >
            Color by mean corridor fidelity
          </button>
          <button
            type="button"
            className="ctrl-btn"
            aria-pressed={colorMode === "coverage"}
            onClick={() => setColorMode("coverage")}
          >
            Color by link coverage
          </button>
        </div>

        {isLoading ? (
          <div className="loading-block">Loading topology…</div>
        ) : (
          <div className="map-wrap" ref={mapWrapRef}>
            <svg ref={svgRef} className="corridor-svg" />
            <div
              className="chiplet-grid"
              style={{ gridTemplateColumns: `repeat(${CHIPLET_GRID_COLS}, 1fr)` }}
            >
              {chipletIds.map((chipletId) => {
                const chipletQubits = qubitsByChiplet.get(chipletId) ?? [];
                const activeCount = chipletQubits.filter((q) => q.presence !== "absent").length;
                return (
                  <div
                    key={chipletId}
                    id={`chip-${chipletId}`}
                    className="chiplet-card"
                    onClick={() => chipletQubits[0] && setSelection({ kind: "qubit", qubit: chipletQubits[0] })}
                  >
                    <div className="chip-head">
                      <span className="chip-id">{chipletId}</span>
                      <span className="chip-count">
                        {activeCount}/{chipletQubits.length} active
                      </span>
                    </div>
                    <div className="qubit-mini-grid">
                      {chipletQubits.map((q) => (
                        <div
                          key={q.qubitIndex}
                          className={`qcell ${q.presence === "absent" ? "absent" : stateSwatchClass(q.frbSimultaneous.state)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelection({ kind: "qubit", qubit: q });
                          }}
                          onMouseEnter={(e) => {
                            const html =
                              q.presence === "absent"
                                ? `<b>q${q.qubitIndex} — ABSENT</b>Not exposed in the ISA. Nominal position only.`
                                : `<b>q${q.qubitIndex}</b>fRB (simultaneous): ${formatMetricValue(q.frbSimultaneous, formatFidelityPct)}`;
                            setTooltip({ html, x: e.clientX + 14, y: e.clientY + 14 });
                          }}
                          onMouseMove={(e) =>
                            setTooltip((t) => (t ? { ...t, x: e.clientX + 14, y: e.clientY + 14 } : t))
                          }
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {q.presence === "absent" ? "×" : q.qubitIndex}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Corridor ranking — composite score (mean fCZ × coverage)</h2>
        <p className="desc">
          Default sort is corridor score, never best-link fidelity alone — the orange tick marks
          each corridor&apos;s single best coupler as a secondary marker only.
        </p>
        {isLoading ? (
          <div className="loading-block">Loading corridors…</div>
        ) : (
          corridors && (
            <>
              <div className="rank-chart">
                <div className="rank-row head">
                  <div>Corridor</div>
                  <div>Score (mean fCZ × coverage)</div>
                  <div>Best link</div>
                  <div>Coverage</div>
                </div>
                {corridors.ranked.map((c) => (
                  <RankRow key={c.corridorId} corridor={c} onSelect={setSelection} />
                ))}
              </div>
              <div className="chart-legend">
                <span className="li">
                  <span className="dot" />
                  Corridor score (bar length)
                </span>
                <span className="li">
                  <span className="tick" />
                  Best individual coupler fCZ (marker)
                </span>
              </div>

              {corridors.unranked.length > 0 && (
                <>
                  <h3 className="unranked-heading">Uncharacterized corridors — excluded from ranking</h3>
                  <p className="desc">
                    Every link sentinel-valued. Shown separately, never appended to the bottom of the
                    ranking as if it were simply the worst corridor.
                  </p>
                  {corridors.unranked.map((c) => (
                    <RankRow key={c.corridorId} corridor={c} onSelect={setSelection} />
                  ))}
                </>
              )}
            </>
          )
        )}
      </div>

      {selection && (
        <div className="panel">
          <h2>Detail</h2>
          <DetailPanel selection={selection} edges={edges} onSelect={setSelection} />
        </div>
      )}

      {tooltip && (
        <div
          className="tooltip show"
          style={{ left: tooltip.x, top: tooltip.y }}
          dangerouslySetInnerHTML={{ __html: tooltip.html }}
        />
      )}

      <style jsx>{`
        .viz-topology {
          --surface-1: #fcfcfb;
          --page-plane: #f9f9f7;
          --text-primary: #0b0b0b;
          --text-secondary: #52514e;
          --muted: #898781;
          --gridline: #e1e0d9;
          --border: rgba(11, 11, 11, 0.1);
          --series-1-250: #86b6ef;
          --series-1-300: #6da7ec;
          --series-1-350: #5598e7;
          --series-1-400: #3987e5;
          --series-1-450: #2a78d6;
          --series-1-500: #256abf;
          --series-1-550: #1c5cab;
          --series-1-600: #184f95;
          --series-2: #eb6834;
          --series-7: #4a3aa7;
          --status-good: #0ca30c;
          --status-warning: #fab219;
          --status-critical: #d03b3b;
          padding: 24px;
          border-radius: 12px;
          background: var(--page-plane);
          color: var(--text-primary);
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }
        .viz-topology[data-theme="dark"] {
          --surface-1: #1a1a19;
          --page-plane: #0d0d0d;
          --text-primary: #ffffff;
          --text-secondary: #c3c2b7;
          --muted: #898781;
          --gridline: #2c2c2a;
          --border: rgba(255, 255, 255, 0.1);
          --series-1-450: #3987e5;
          --series-2: #d95926;
          --series-7: #9085e9;
          --status-critical: #e66767;
        }
        .header, .panel {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 18px 22px;
          margin-bottom: 16px;
        }
        .header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
        .title { font-size: 19px; font-weight: 700; letter-spacing: -0.01em; }
        .subtitle { font-size: 12.5px; color: var(--text-secondary); margin-top: 3px; }
        .provenance-note { font-size: 12px; color: var(--series-7); margin: 10px 0 0; font-weight: 600; }
        .badges { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; align-items: center; }
        .badge { font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border); color: var(--text-secondary); white-space: nowrap; }
        .badge.provenance { color: var(--series-7); border-color: var(--series-7); }
        .badge.stale { color: var(--status-critical); border-color: var(--status-critical); }
        .theme-toggle { font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer; }
        .panel h2 { font-size: 14px; margin: 0 0 2px 0; }
        .panel h3.unranked-heading { font-size: 13px; margin: 18px 0 4px; color: var(--series-7); }
        .panel .desc { font-size: 12.5px; color: var(--text-secondary); margin: 0 0 16px 0; max-width: 74ch; }
        .legend-row { display: flex; flex-wrap: wrap; gap: 18px; }
        .legend-item { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--text-secondary); }
        .swatch { width: 14px; height: 14px; border-radius: 4px; flex: none; border: 1px solid var(--border); display: inline-block; }
        .swatch-active { background: var(--series-1-450); }
        .swatch-degraded { background: var(--status-warning); }
        .swatch-sentinel { background: repeating-linear-gradient(45deg, var(--series-7), var(--series-7) 2px, transparent 2px, transparent 5px); border-color: var(--series-7); }
        .swatch-absent { background: transparent; border: 1.5px dashed var(--muted); }
        .map-controls { display: flex; gap: 6px; margin-bottom: 16px; }
        .ctrl-btn { font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer; }
        .ctrl-btn[aria-pressed="true"] { background: var(--series-1-450); border-color: var(--series-1-450); color: #fff; }
        .loading-block { height: 200px; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 13px; }
        .map-wrap { position: relative; }
        .corridor-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
        .chiplet-grid { position: relative; display: grid; gap: 40px 48px; padding: 10px 24px; }
        .chiplet-card { position: relative; background: var(--page-plane); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px 12px; z-index: 2; cursor: pointer; }
        .chip-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
        .chip-id { font-size: 13px; font-weight: 700; }
        .chip-count { font-size: 10.5px; color: var(--muted); }
        .qubit-mini-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; }
        .qcell { aspect-ratio: 1; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 8.5px; color: var(--text-secondary); border: 1px solid var(--border); cursor: pointer; }
        .qcell.swatch-active { background: var(--series-1-250); }
        .qcell.swatch-degraded { background: var(--status-warning); }
        .qcell.swatch-sentinel { background: repeating-linear-gradient(45deg, var(--series-7), var(--series-7) 2px, transparent 2px, transparent 5px); color: #fff; }
        .qcell.absent { background: transparent; border: 1.5px dashed var(--muted); color: var(--muted); }
        .rank-chart { display: flex; flex-direction: column; }
        .rank-row { display: grid; grid-template-columns: 82px 1fr 140px 64px; align-items: center; gap: 10px; padding: 5px 0; cursor: pointer; }
        .rank-row.head { font-size: 10.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; padding-bottom: 8px; border-bottom: 1px solid var(--gridline); margin-bottom: 4px; cursor: default; }
        .rank-label { font-size: 12.5px; font-weight: 600; }
        .rank-track { position: relative; height: 16px; background: var(--gridline); border-radius: 4px; overflow: visible; }
        .rank-bar { position: absolute; top: 0; left: 0; bottom: 0; border-radius: 4px; background: var(--series-1-450); }
        .rank-tick { position: absolute; top: -3px; width: 3px; height: 22px; background: var(--series-2); border-radius: 2px; transform: translateX(-1.5px); }
        .rank-score { font-size: 12px; font-variant-numeric: tabular-nums; color: var(--text-secondary); text-align: right; }
        .rank-cov { font-size: 11px; font-variant-numeric: tabular-nums; color: var(--muted); text-align: right; }
        .rank-row.uncharacterized .rank-track { background: repeating-linear-gradient(45deg, var(--series-7), var(--series-7) 3px, transparent 3px, transparent 7px); border: 1px dashed var(--series-7); }
        .chart-legend { display: flex; gap: 20px; margin-top: 14px; font-size: 11.5px; color: var(--text-secondary); }
        .chart-legend .li { display: flex; align-items: center; gap: 6px; }
        .chart-legend .dot { width: 10px; height: 10px; border-radius: 2px; background: var(--series-1-450); }
        .chart-legend .tick { width: 3px; height: 12px; background: var(--series-2); border-radius: 2px; }
        .detail-panel { font-size: 12.5px; color: var(--text-secondary); }
        .detail-head { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
        .detail-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
        .detail-sub { font-size: 12px; color: var(--muted); margin: 8px 0 0; }
        .metric-row { display: grid; grid-template-columns: 1fr 100px 140px 140px; gap: 10px; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--gridline); }
        .metric-label { font-weight: 600; color: var(--text-primary); }
        .metric-state { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; text-align: center; color: #fff; }
        .metric-state.swatch-active { background: var(--series-1-450); }
        .metric-state.swatch-degraded { background: var(--status-warning); color: #3a2a00; }
        .metric-state.swatch-sentinel { background: var(--series-7); }
        .metric-state.swatch-absent { background: var(--muted); }
        .metric-value { font-variant-numeric: tabular-nums; }
        .metric-error { font-size: 11px; color: var(--muted); }
        .raw-values { margin-top: 12px; font-size: 11.5px; }
        .raw-values summary { cursor: pointer; color: var(--series-7); font-weight: 600; }
        .raw-values-note { color: var(--muted); margin: 6px 0; }
        .raw-values pre { background: var(--gridline); padding: 8px; border-radius: 6px; overflow-x: auto; }
        .tooltip { position: fixed; pointer-events: none; z-index: 50; background: var(--text-primary); color: var(--surface-1); font-size: 12px; line-height: 1.5; padding: 8px 11px; border-radius: 8px; max-width: 280px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25); }
        .corridor-edge-list { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
        .corridor-edge-item { display: grid; grid-template-columns: 90px 100px 1fr; align-items: center; gap: 10px; padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--page-plane); color: var(--text-secondary); font-size: 12px; cursor: pointer; text-align: left; }
        .corridor-edge-item:hover { border-color: var(--series-1-450); }
      `}</style>
    </div>
  );
}

function RankRow({
  corridor,
  onSelect,
}: {
  corridor: CorridorEntry;
  onSelect: (s: Selection) => void;
}) {
  const uncharacterized = corridor.score === null;
  const barPct = uncharacterized ? 0 : Math.max(2, (corridor.score as number) * 100);
  const tickPct = corridor.bestLinkFcz === null ? null : corridor.bestLinkFcz * 100;
  return (
    <div
      className={`rank-row ${uncharacterized ? "uncharacterized" : ""}`}
      onClick={() => onSelect({ kind: "corridor", corridor })}
    >
      <div className="rank-label">{corridor.corridorId}</div>
      <div className="rank-track">
        {!uncharacterized && <div className="rank-bar" style={{ width: `${barPct}%` }} />}
        {tickPct !== null && <div className="rank-tick" style={{ left: `${tickPct}%` }} />}
      </div>
      <div className="rank-score">
        {uncharacterized
          ? "not measured"
          : corridor.bestLink
            ? `q${corridor.bestLink[0]}–q${corridor.bestLink[1]} ${formatFidelityPct(corridor.bestLinkFcz, 2)}`
            : "—"}
      </div>
      <div className="rank-cov">
        {corridor.validLinks}/{corridor.expectedLinks}
      </div>
    </div>
  );
}
