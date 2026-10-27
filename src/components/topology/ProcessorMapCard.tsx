"use client";

import type { CorridorEntry, EdgeEntry, LatticeShape, Metric, QubitEntry } from "@/lib/topology/client";
import {
  formatFidelityPct,
  formatMetricValue,
  formatScore,
  formatHours,
  formatMeasuredAge,
  stateLabel,
} from "@/lib/topology/format";
import { cellPositionInChiplet } from "@/lib/topology/layout";
import {
  colorableValue,
  CZ_ERROR_BANDS,
  couplerBand,
  isDegraded,
  QUBIT_MAP_METRICS,
  type CouplerBand,
  type QubitMapMetric,
  type QubitMapMetricId,
  isStaleAge,
  METRIC_STALE_AFTER_SECONDS,
  metricAgeSeconds,
  type AgeReference,
} from "@/lib/topology/thresholds";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { MdArrowLeft, MdArrowRight } from "react-icons/md";
import ChipletBox from "./ChipletBox";
import { clampedRange, qualityRgb, scoreColor, toCss } from "./errorGradient";
import { couplerSegment, gapBand, type Rect, type Segment } from "./mapGeometry";
import { COUPLER_STYLES, STATE_CLASSES } from "./stateStyles";
import type { Selection, TooltipState } from "./types";

// Layout comes from the snapshot's descriptor (`lattice`): chiplets per row
// = chipletArrayCols, cells per chiplet row = chipletSize, and each qubit
// cell is pinned to its physical latticeRow/latticeCol. These fallbacks
// (Cepheus's documented 3x4 array of 3x3 chiplets, index order) apply only
// when a snapshot has no descriptor.
const FALLBACK_CHIPLET_GRID_COLS = 3;
const FALLBACK_CHIPLET_SIZE = 3;

// Wider than ChipletBox's default gap-1 so a coupler segment between two
// cells is long enough to see and hover.
const CELL_GAP_CLASS = "gap-2.5";
const COUPLER_WIDTH = 2.5;
const COUPLER_HIT_WIDTH = 10;
const CORRIDOR_INSET = 1;
const CORRIDOR_FILL_OPACITY = 0.35;
const UNSCORED_CORRIDOR_COLOR = "#a78bfa";
const SELECTED_STROKE = "#111827";
// Below-threshold ring on a qubit cell — amber, the same warning color as
// the coupler warn band and the "Degraded" state badge.
const DEGRADED_RING = "0 0 0 2px #f59e0b";
const GRADIENT_CSS = "linear-gradient(90deg, #00E494, #27728B, #4E0082)";

interface Overlay {
  width: number;
  height: number;
  corridors: { corridor: CorridorEntry; band: Rect }[];
  couplers: { edge: EdgeEntry; segment: Segment; band: CouplerBand }[];
}
const EMPTY_OVERLAY: Overlay = { width: 0, height: 0, corridors: [], couplers: [] };

function edgeKey(e: EdgeEntry): string {
  return `${e.nodeA}-${e.nodeB}`;
}

// Stale (older than METRIC_STALE_AFTER_SECONDS) is shown, never hidden:
// faded on the map, greyed with a note in the tooltip and detail panel.
const STALE_OPACITY = 0.35;

/** "<br/>measured 5h ago" for a measured value; nothing for sentinel/absent (no measurement to date) or when no time was recorded. */
function measuredLine(m: Metric, ageRef: AgeReference | null): string {
  if ((m.state !== "active" && m.state !== "degraded") || !m.measuredAt) return "";
  const age = metricAgeSeconds(m.measuredAt, ageRef);
  if (age === null) return "";
  return isStaleAge(age)
    ? `<br/><span style="color:#9ca3af">${formatMeasuredAge(age)} — older than ${formatHours(METRIC_STALE_AFTER_SECONDS)}</span>`
    : `<br/>${formatMeasuredAge(age)}`;
}

function isStaleMetric(m: Metric, ageRef: AgeReference | null): boolean {
  return (m.state === "active" || m.state === "degraded") && isStaleAge(metricAgeSeconds(m.measuredAt, ageRef));
}

function couplerTooltip(e: EdgeEntry, ageRef: AgeReference | null): string {
  const where = e.corridorId
    ? `corridor ${e.corridorId}`
    : `intra-chiplet${e.chipletA ? ` ${e.chipletA}` : ""}`;
  const value = formatMetricValue(e.cz, (v) => formatFidelityPct(v, 2));
  const error =
    e.cz.state !== "sentinel" && e.cz.error !== null ? ` ± ${(e.cz.error * 100).toFixed(2)}%` : "";
  const state = e.presence === "absent" ? stateLabel("absent") : stateLabel(e.cz.state);
  return `<b>q${e.nodeA}–q${e.nodeB}</b> · ${where}<br/>CZ fidelity ${value}${error}<br/>State: ${state}${measuredLine(e.cz, ageRef)}`;
}

function qubitTooltip(q: QubitEntry, metric: QubitMapMetric, ageRef: AgeReference | null): string {
  if (q.presence === "absent") {
    return `<b>q${q.qubitIndex}</b> — absent<br/>Not exposed in the ISA.`;
  }
  const m = metric.source(q);
  const value = formatMetricValue({ ...m, value: metric.displayValue(m) }, metric.format);
  // Error bars are on the source fidelity/seconds; 1 - x keeps the same magnitude.
  const error =
    (m.state === "active" || m.state === "degraded") && m.error !== null ? ` ± ${metric.format(m.error)}` : "";
  const flag = isDegraded(q, metric) && metric.threshold ? `<br/>⚠ Below threshold (${metric.threshold.label})` : "";
  return `<b>q${q.qubitIndex}</b> · ${q.chipletId ?? "—"}<br/>${metric.label}: ${value}${error}<br/>State: ${stateLabel(m.state)}${flag}${measuredLine(m, ageRef)}`;
}

function pct(v: number): string {
  return `${+(v * 100).toFixed(2)}%`;
}

/** One coupler legend swatch: a short line in that band's stroke. */
function CouplerSwatch({ band }: { band: CouplerBand }) {
  const s = COUPLER_STYLES[band];
  return (
    <svg width="18" height="6" aria-hidden>
      <line x1="1" y1="3" x2="17" y2="3" stroke={s.stroke} strokeWidth={COUPLER_WIDTH} strokeDasharray={s.dash} />
    </svg>
  );
}

export default function ProcessorMapCard({
  allCorridors,
  edges,
  chipletIds,
  qubitsByChiplet,
  lattice,
  scoreRange,
  selection,
  ageRef,
  actions,
  onSelect,
  onTooltip,
}: {
  allCorridors: CorridorEntry[];
  /** Every coupler, intra- and inter-chiplet — each is drawn on the map. */
  edges: EdgeEntry[];
  /** In display order — row-major physical order when `lattice` is known. */
  chipletIds: string[];
  qubitsByChiplet: Map<string, QubitEntry[]>;
  lattice: LatticeShape | null;
  scoreRange: { lo: number; hi: number };
  /** Highlights the selected coupler/corridor on the map. */
  selection: Selection | null;
  /** Anchors per-metric "measured Xh ago" on the snapshot's server-side age. */
  ageRef: AgeReference | null;
  /** Extra controls for the card header (e.g. snapshot export). */
  actions?: ReactNode;
  onSelect: (s: Selection) => void;
  onTooltip: Dispatch<SetStateAction<TooltipState | null>>;
}) {
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [hoveredQubit, setHoveredQubit] = useState<number | null>(null);
  const [metricId, setMetricId] = useState<QubitMapMetricId>("frbSimultaneous");
  const metric = QUBIT_MAP_METRICS.find((m) => m.id === metricId) ?? QUBIT_MAP_METRICS[0];

  // 5th–95th percentile of the selected metric's measured values only —
  // sentinel/absent keep their fixed swatches and are never part of it.
  // Values beyond it pin to the end color; their tooltip still shows the
  // real number and the threshold ring is decided on the real number too.
  const valueRange = useMemo(
    () =>
      clampedRange(
        Array.from(qubitsByChiplet.values())
          .flat()
          .map((q) => colorableValue(q, metric))
          .filter((v): v is number => v !== null),
      ),
    [qubitsByChiplet, metric],
  );
  const degradedCount = useMemo(
    () => Array.from(qubitsByChiplet.values()).flat().filter((q) => isDegraded(q, metric)).length,
    [qubitsByChiplet, metric],
  );
  // Legend reads good -> bad, left to right, matching the gradient. An end
  // with values beyond it gets ≥/≤ — "≥ 12% shown as worst".
  const legendEnds = valueRange
    ? metric.better === "higher"
      ? [
          `${valueRange.clippedHigh ? "≥ " : ""}${metric.format(valueRange.max)}`,
          `${valueRange.clippedLow ? "≤ " : ""}${metric.format(valueRange.min)}`,
        ]
      : [
          `${valueRange.clippedLow ? "≤ " : ""}${metric.format(valueRange.min)}`,
          `${valueRange.clippedHigh ? "≥ " : ""}${metric.format(valueRange.max)}`,
        ]
    : null;
  const rangeClipped = !!valueRange && (valueRange.clippedLow || valueRange.clippedHigh);

  const tooltipAt = (e: { clientX: number; clientY: number }, html: string) =>
    onTooltip({ html, x: e.clientX + 12, y: e.clientY + 12 });
  const moveTooltip = (e: { clientX: number; clientY: number }) =>
    onTooltip((t) => (t ? { ...t, x: e.clientX + 12, y: e.clientY + 12 } : t));

  // Overlay geometry is measured from the rendered cells/boxes (by id), so
  // it follows whatever the grid does — breakpoints, physical positions,
  // the fallback order — without restating that layout here.
  const [overlay, setOverlay] = useState<Overlay>(EMPTY_OVERLAY);
  const measure = useCallback(() => {
    const wrap = mapWrapRef.current;
    if (!wrap) return;
    const origin = wrap.getBoundingClientRect();
    const rectOf = (el: Element): Rect => {
      const r = el.getBoundingClientRect();
      return { left: r.left - origin.left, top: r.top - origin.top, width: r.width, height: r.height };
    };

    const corridors: Overlay["corridors"] = [];
    for (const corridor of allCorridors) {
      const [aId, bId] = corridor.corridorId.split("-");
      const elA = wrap.querySelector(`#chip-${aId}`);
      const elB = wrap.querySelector(`#chip-${bId}`);
      const band = elA && elB ? gapBand(rectOf(elA), rectOf(elB)) : null;
      if (band) corridors.push({ corridor, band });
    }

    const couplers: Overlay["couplers"] = [];
    for (const edge of edges) {
      const cellA = wrap.querySelector(`#qcell-${edge.nodeA}`);
      const cellB = wrap.querySelector(`#qcell-${edge.nodeB}`);
      if (!cellA || !cellB) continue;
      // Same chiplet box -> clip at the cells (the segment spans the cell
      // gap); different boxes -> clip at the boxes (it spans the chiplet gap).
      const boxA = cellA.closest('[id^="chip-"]');
      const boxB = cellB.closest('[id^="chip-"]');
      const a = rectOf(cellA);
      const b = rectOf(cellB);
      const segment =
        !boxA || !boxB || boxA === boxB
          ? couplerSegment(a, b, a, b)
          : couplerSegment(a, b, rectOf(boxA), rectOf(boxB));
      if (segment) couplers.push({ edge, segment, band: couplerBand(edge) });
    }

    setOverlay({ width: origin.width, height: origin.height, corridors, couplers });
  }, [allCorridors, edges]);

  useLayoutEffect(() => {
    measure();
    const wrap = mapWrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
    // chipletIds/qubitsByChiplet/lattice: cells move when these change even
    // if the wrapper's own size doesn't. selection: a selected chiplet box
    // gets a 2px border (ChipletBox), which shifts its cells by a pixel.
  }, [measure, chipletIds, qubitsByChiplet, lattice, selection]);

  const selectedEdgeKey = selection?.kind === "edge" ? edgeKey(selection.edge) : null;
  const selectedCorridorId = selection?.kind === "corridor" ? selection.corridor.corridorId : null;
  const selectedChipletId = selection?.kind === "chiplet" ? selection.chipletId : null;

  return (
    <div className="default-radius border-2 border-gray-50 bg-white p-4">
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="block text-md font-semibold text-gray-400">
            Processor map
          </h2>
          {actions}
        </div>
        <div
          role="radiogroup"
          aria-label="Qubit metric"
          className="flex w-fit flex-wrap gap-1 rounded-md border border-gray-100 p-0.5 text-xs text-gray-500"
        >
          {QUBIT_MAP_METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={m.id === metric.id}
              onClick={() => setMetricId(m.id)}
              className={`cursor-pointer rounded px-2 py-1 ${
                m.id === metric.id ? "bg-gray-100 font-medium text-gray-700" : "hover:text-gray-600"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className="font-medium text-gray-600">Qubits</span>
          <span className="flex flex-wrap items-center gap-1" data-legend="metric-range">
            {metric.label} ({metric.better === "higher" ? "higher" : "lower"} is better)
            {legendEnds ? (
              <>
                <span className="whitespace-nowrap">{legendEnds[0]}</span>
                <MdArrowRight className="text-xl" />
                <span
                  style={{ display: "block", width: 44, height: 8, borderRadius: 2, background: GRADIENT_CSS }}
                />
                <MdArrowLeft className="text-xl" />
                <span className="whitespace-nowrap">{legendEnds[1]}</span>
                {rangeClipped && (
                  <span className="text-gray-400">(5th–95th percentile; beyond shown as end color)</span>
                )}
              </>
            ) : (
              <span>not measured</span>
            )}
          </span>
          {/* The four-state model's DEGRADED: measured and below the §3
              threshold. Assigned here from thresholds.ts (ingest never
              assigns it), so the legend entry is the threshold marker. */}
          <span className="flex items-center gap-1" data-legend="degraded">
            <span className="h-2.5 w-2.5 default-radius bg-gray-200" style={{ boxShadow: DEGRADED_RING }} />
            {metric.threshold
              ? `Degraded: ${metric.threshold.label} (${degradedCount})`
              : `Degraded: no threshold defined for ${metric.label}`}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 default-radius border border-dashed border-purple-400 bg-purple-100" />
            Sentinel (unmeasured)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 default-radius border border-dashed border-gray-300" />
            Absent
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className="font-medium text-gray-600">Couplers (CZ error)</span>
          <span className="flex items-center gap-1">
            <CouplerSwatch band="good" />
            &lt; {pct(CZ_ERROR_BANDS.goodBelow)}
          </span>
          <span className="flex items-center gap-1">
            <CouplerSwatch band="warn" />
            {pct(CZ_ERROR_BANDS.goodBelow)}–{pct(CZ_ERROR_BANDS.warnUpTo)}
          </span>
          <span className="flex items-center gap-1">
            <CouplerSwatch band="bad" />
            &gt; {pct(CZ_ERROR_BANDS.warnUpTo)}
          </span>
          <span className="flex items-center gap-1">
            <CouplerSwatch band="uncalibrated" />
            Uncalibrated
          </span>
          <span className="flex items-center gap-1">
            <span
              className="h-2.5 w-4 rounded-sm"
              style={{ background: "linear-gradient(90deg, #00E494, #27728B, #4E0082)", opacity: CORRIDOR_FILL_OPACITY + 0.15 }}
            />
            Corridor (band, by score)
          </span>
          <span className="flex items-center gap-1">
            <span
              className="h-2.5 w-4 rounded-sm border-[1.5px] border-dashed"
              style={{ borderColor: UNSCORED_CORRIDOR_COLOR }}
            />
            Corridor uncharacterized
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1" data-legend="stale">
            <span className="h-2.5 w-2.5 default-radius bg-[#27728B]" style={{ opacity: STALE_OPACITY }} />
            Faded: measured more than {formatHours(METRIC_STALE_AFTER_SECONDS)} ago
          </span>
        </div>
      </div>

      <div className="relative mx-auto max-w-md" ref={mapWrapRef}>
        <div
          className="relative grid gap-4 p-3"
          style={{
            gridTemplateColumns: `repeat(${lattice?.chipletArrayCols ?? FALLBACK_CHIPLET_GRID_COLS}, 1fr)`,
          }}
        >
          {chipletIds.map((chipletId) => {
            const chipletQubits = qubitsByChiplet.get(chipletId) ?? [];
            const activeCount = chipletQubits.filter(
              (q) => q.presence !== "absent",
            ).length;
            return (
              <ChipletBox
                key={chipletId}
                id={`chip-${chipletId}`}
                label={chipletId}
                countLabel={`${activeCount}/${chipletQubits.length}`}
                gridCols={lattice?.chipletSize ?? FALLBACK_CHIPLET_SIZE}
                cellGapClassName={CELL_GAP_CLASS}
                selected={chipletId === selectedChipletId}
                onClick={() => onSelect({ kind: "chiplet", chipletId })}
                cells={chipletQubits.map((q) => {
                  const value = colorableValue(q, metric);
                  const gradientColor =
                    value !== null && valueRange
                      ? toCss(qualityRgb(value, valueRange, metric.better), hoveredQubit === q.qubitIndex)
                      : null;
                  const degraded = isDegraded(q, metric);
                  const extra = {
                    ...(degraded ? { boxShadow: DEGRADED_RING } : {}),
                    ...(isStaleMetric(metric.source(q), ageRef) ? { opacity: STALE_OPACITY } : {}),
                  };
                  return {
                    key: q.qubitIndex,
                    id: `qcell-${q.qubitIndex}`,
                    position: cellPositionInChiplet(q, lattice),
                    className: gradientColor
                      ? "transition-colors duration-150"
                      : q.presence === "absent"
                        ? STATE_CLASSES.absent.cell
                        : STATE_CLASSES[metric.source(q).state].cell,
                    style: gradientColor
                      ? { backgroundColor: gradientColor, borderColor: gradientColor, ...extra }
                      : extra,
                    onClick: (e) => {
                      e.stopPropagation();
                      onSelect({ kind: "qubit", qubit: q });
                    },
                    onMouseEnter: (e) => {
                      setHoveredQubit(q.qubitIndex);
                      tooltipAt(e, qubitTooltip(q, metric, ageRef));
                    },
                    onMouseMove: moveTooltip,
                    onMouseLeave: () => {
                      setHoveredQubit(null);
                      onTooltip(null);
                    },
                  };
                })}
              />
            );
          })}
        </div>

        {/* Overlay above the chiplets, but everything in it sits in the gaps
            (see mapGeometry.ts), so it never covers a cell or a label. The
            svg itself ignores the pointer; each shape opts back in. */}
        <svg
          className="pointer-events-none absolute inset-0 z-20 overflow-visible"
          width={overlay.width}
          height={overlay.height}
          viewBox={`0 0 ${overlay.width} ${overlay.height}`}
        >
          {/* Corridors first and translucent — couplers cross them on top. */}
          {overlay.corridors.map(({ corridor, band }) => {
            // Unscored is an outline with no fill: a translucent fill from the
            // purple (low-score) end of the gradient would look the same as a
            // lavender "uncharacterized" fill.
            const unscored = corridor.score === null;
            const fill = unscored ? "none" : scoreColor(corridor.score as number, scoreRange);
            const selected = corridor.corridorId === selectedCorridorId;
            return (
              <rect
                key={corridor.corridorId}
                data-corridor={corridor.corridorId}
                x={band.left + CORRIDOR_INSET}
                y={band.top + CORRIDOR_INSET}
                width={Math.max(0, band.width - 2 * CORRIDOR_INSET)}
                height={Math.max(0, band.height - 2 * CORRIDOR_INSET)}
                rx={3}
                fill={fill}
                fillOpacity={CORRIDOR_FILL_OPACITY}
                stroke={selected ? SELECTED_STROKE : unscored ? UNSCORED_CORRIDOR_COLOR : "none"}
                strokeWidth={selected ? 2 : 1.5}
                strokeDasharray={!selected && unscored ? "3 2" : undefined}
                // fill="none" isn't hit-testable by default; keep the whole band clickable.
                style={{ pointerEvents: "all" }}
                className="cursor-pointer"
                onClick={() => onSelect({ kind: "corridor", corridor })}
                onMouseEnter={(e) =>
                  tooltipAt(
                    e,
                    unscored
                      ? `<b>${corridor.corridorId} — uncharacterized</b><br/>${corridor.sentinelLinks}/${corridor.expectedLinks} links sentinel.`
                      : `<b>Corridor ${corridor.corridorId}</b><br/>score ${formatScore(corridor.score, 3)} · mean fCZ ${formatFidelityPct(corridor.meanFcz, 2)} · ${corridor.validLinks}/${corridor.expectedLinks} links`,
                  )
                }
                onMouseMove={moveTooltip}
                onMouseLeave={() => onTooltip(null)}
              />
            );
          })}

          {overlay.couplers.map(({ edge, segment, band }) => {
            const style = COUPLER_STYLES[band];
            const key = edgeKey(edge);
            const selected = key === selectedEdgeKey;
            return (
              <g key={key}>
                {selected && (
                  <line
                    {...segment}
                    stroke={SELECTED_STROKE}
                    strokeWidth={COUPLER_WIDTH + 3}
                    strokeLinecap="round"
                  />
                )}
                <line
                  {...segment}
                  data-band={band}
                  stroke={style.stroke}
                  strokeWidth={COUPLER_WIDTH}
                  strokeDasharray={style.dash}
                  strokeLinecap={style.dash ? "butt" : "round"}
                  strokeOpacity={isStaleMetric(edge.cz, ageRef) ? STALE_OPACITY : undefined}
                />
                {/* Invisible, wider hit target — the visible stroke is too thin to hover reliably. */}
                <line
                  {...segment}
                  data-coupler={key}
                  stroke="transparent"
                  strokeWidth={COUPLER_HIT_WIDTH}
                  className="cursor-pointer"
                  style={{ pointerEvents: "stroke" }}
                  onClick={() => onSelect({ kind: "edge", edge })}
                  onMouseEnter={(e) => tooltipAt(e, couplerTooltip(edge, ageRef))}
                  onMouseMove={moveTooltip}
                  onMouseLeave={() => onTooltip(null)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
