"use client";

import type { CorridorEntry, EdgeEntry, LatticeShape, Metric, QubitEntry } from "@/lib/topology/client";
import {
  formatHours,
  formatMeasuredAge,
  formatMetricValue,
  formatPct,
  formatPctErrorBar,
  NOT_MEASURED,
} from "@/lib/topology/format";
import { cellPositionInChiplet } from "@/lib/topology/layout";
import {
  colorableValue,
  CZ_ERROR_BANDS,
  couplerBand,
  isDegraded,
  isStaleAge,
  METRIC_STALE_AFTER_SECONDS,
  metricAgeSeconds,
  QUBIT_MAP_METRICS,
  type AgeReference,
  type CouplerBand,
  type QubitMapMetric,
  type QubitMapMetricId,
} from "@/lib/topology/thresholds";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import ChipletBox from "./ChipletBox";
import { clampedRange, qualityRgb, scoreColor, toCss } from "./errorGradient";
import { couplerSegment, gapBand, type Rect, type Segment } from "./mapGeometry";
import { COUPLER_STYLES, fittedDash, STATE_CLASSES } from "./stateStyles";
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
const COUPLER_HIT_WIDTH = 10;
const CORRIDOR_INSET = 1;
const CORRIDOR_FILL_OPACITY = 0.35;
const UNSCORED_CORRIDOR_COLOR = "#a78bfa";
const SELECTED_STROKE = "#111827";
// Below-threshold ring on a qubit cell: amber, the same warning color as
// the coupler warn band.
const DEGRADED_RING = "0 0 0 2px #f59e0b";
const GRADIENT_CSS = "linear-gradient(90deg, #00E494, #27728B, #4E0082)";
// Stale (older than METRIC_STALE_AFTER_SECONDS) is shown, never hidden:
// faded on the map, with a note in the tooltip and detail panel.
const STALE_OPACITY = 0.35;

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

function isMeasured(m: Metric): boolean {
  return m.state === "active" || m.state === "degraded";
}

/** "<br/>Measured 5 hours ago", for a measured value with a recorded time; nothing otherwise. */
function measuredLine(m: Metric, ageRef: AgeReference | null): string {
  if (!isMeasured(m) || !m.measuredAt) return "";
  const age = metricAgeSeconds(m.measuredAt, ageRef);
  if (age === null) return "";
  return isStaleAge(age)
    ? `<br/><span style="color:#fbbf24">${formatMeasuredAge(age)}. Older than ${formatHours(METRIC_STALE_AFTER_SECONDS)}.</span>`
    : `<br/>${formatMeasuredAge(age)}`;
}

function isStaleMetric(m: Metric, ageRef: AgeReference | null): boolean {
  return isMeasured(m) && isStaleAge(metricAgeSeconds(m.measuredAt, ageRef));
}

function couplerTooltip(e: EdgeEntry, ageRef: AgeReference | null): string {
  const where = e.corridorId ? `link ${e.corridorId}` : `inside ${e.chipletA ?? "chiplet"}`;
  const head = `<b>q${e.nodeA}-q${e.nodeB}</b> · ${where}`;
  if (e.presence === "absent") return `${head}<br/>Absent`;
  if (!isMeasured(e.cz) || e.cz.value === null) return `${head}<br/>CZ error: ${NOT_MEASURED}`;
  const error = e.cz.error !== null ? ` ${formatPctErrorBar(e.cz.error)}` : "";
  const over = couplerBand(e) === "bad" ? "<br/>Below threshold" : "";
  return `${head}<br/>CZ error: ${formatPct(1 - e.cz.value)}${error}${over}${measuredLine(e.cz, ageRef)}`;
}

function qubitTooltip(q: QubitEntry, metric: QubitMapMetric, ageRef: AgeReference | null): string {
  const head = `<b>q${q.qubitIndex}</b>${q.chipletId ? ` · ${q.chipletId}` : ""}`;
  if (q.presence === "absent") return `${head}<br/>Absent`;
  const m = metric.source(q);
  const value = formatMetricValue({ ...m, value: metric.displayValue(m) }, metric.format);
  // The error bar is on the source value; 1 - x keeps the same magnitude.
  const errorBar =
    isMeasured(m) && m.error !== null ? ` ${metric.id === "t1" || metric.id === "t2Star" ? `± ${metric.format(m.error)}` : formatPctErrorBar(m.error)}` : "";
  const flag = isDegraded(q, metric) ? "<br/>Below threshold" : "";
  return `${head}<br/>${metric.label}: ${value}${errorBar}${flag}${measuredLine(m, ageRef)}`;
}

function pct(v: number): string {
  return `${+(v * 100).toFixed(2)}%`;
}

// --- Legend -----------------------------------------------------------------

function LegendGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div>
      {title && <p className="mb-1.5 text-xs font-medium text-gray-700">{title}</p>}
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </div>
  );
}

function LegendItem({ swatch, children, ...rest }: { swatch: ReactNode; children: ReactNode; [data: `data-${string}`]: string }) {
  return (
    <li className="flex items-center gap-2" {...rest}>
      <span className="flex w-5 shrink-0 items-center justify-center">{swatch}</span>
      <span>{children}</span>
    </li>
  );
}

function CouplerSwatch({ band }: { band: CouplerBand }) {
  const s = COUPLER_STYLES[band];
  return (
    <svg width="20" height="6" aria-hidden>
      <line x1="0" y1="3" x2="20" y2="3" stroke={s.stroke} strokeWidth={s.width} strokeDasharray={s.dash ? fittedDash(20, s.dash) : undefined} />
    </svg>
  );
}

const cellSwatch = "h-3 w-3 default-radius border";

// --- Card -------------------------------------------------------------------

export default function ProcessorMapCard({
  allCorridors,
  edges,
  chipletIds,
  qubitsByChiplet,
  lattice,
  scoreRange,
  selection,
  ageRef,
  layoutConfirmed,
  actions,
  onSelect,
  onTooltip,
}: {
  allCorridors: CorridorEntry[];
  /** Every coupler, intra- and inter-chiplet; each is drawn on the map. */
  edges: EdgeEntry[];
  /** In display order: row-major physical order when `lattice` is known. */
  chipletIds: string[];
  qubitsByChiplet: Map<string, QubitEntry[]>;
  lattice: LatticeShape | null;
  scoreRange: { lo: number; hi: number };
  /** Highlights the selected coupler/link/chiplet on the map. */
  selection: Selection | null;
  /** Anchors per-metric "Measured X ago" on the snapshot's server-side age. */
  ageRef: AgeReference | null;
  /** false when Rigetti hasn't confirmed which qubits form which chiplet (descriptor provenance "inferred"). */
  layoutConfirmed: boolean;
  /** Extra controls for the card header (the downloads). */
  actions?: ReactNode;
  onSelect: (s: Selection) => void;
  onTooltip: Dispatch<SetStateAction<TooltipState | null>>;
}) {
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const [hoveredQubit, setHoveredQubit] = useState<number | null>(null);
  const [metricId, setMetricId] = useState<QubitMapMetricId>("frbSimultaneous");
  const metric = QUBIT_MAP_METRICS.find((m) => m.id === metricId) ?? QUBIT_MAP_METRICS[0];

  // Colors span the 5th to 95th percentile of the selected metric's measured
  // values; values beyond it pin to the end color. The legend's Best/Worst
  // labels are the true extremes, so they never claim a better or worse
  // value than the chip has. Unmeasured/absent qubits are never in either.
  const measuredValues = useMemo(
    () =>
      Array.from(qubitsByChiplet.values())
        .flat()
        .map((q) => colorableValue(q, metric))
        .filter((v): v is number => v !== null),
    [qubitsByChiplet, metric],
  );
  const valueRange = useMemo(() => clampedRange(measuredValues), [measuredValues]);
  const degradedCount = useMemo(
    () => Array.from(qubitsByChiplet.values()).flat().filter((q) => isDegraded(q, metric)).length,
    [qubitsByChiplet, metric],
  );
  const extremes =
    measuredValues.length === 0
      ? null
      : metric.better === "higher"
        ? { best: Math.max(...measuredValues), worst: Math.min(...measuredValues) }
        : { best: Math.min(...measuredValues), worst: Math.max(...measuredValues) };
  const rangeClipped = !!valueRange && (valueRange.clippedLow || valueRange.clippedHigh);

  const tooltipAt = (e: { clientX: number; clientY: number }, html: string) =>
    onTooltip({ html, x: e.clientX + 12, y: e.clientY + 12 });
  const moveTooltip = (e: { clientX: number; clientY: number }) =>
    onTooltip((t) => (t ? { ...t, x: e.clientX + 12, y: e.clientY + 12 } : t));

  // Overlay geometry is measured from the rendered cells/boxes (by id), so
  // it follows whatever the grid does (breakpoints, physical positions,
  // the fallback order) without restating that layout here.
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

  const legend = (
    <div
      className="grid shrink-0 grid-cols-2 gap-x-4 gap-y-4 text-xs text-gray-600 sm:flex sm:w-44 sm:flex-col sm:gap-4 sm:pt-3"
      data-legend-panel
    >
      <LegendGroup title="Qubits">
        <li data-legend="metric-range">
          <div
            className="h-2 w-full rounded-sm"
            style={{ background: GRADIENT_CSS }}
            aria-label={rangeClipped ? "A few extreme values share the end colors, so the rest are easier to tell apart." : undefined}
            onMouseEnter={(e: MouseEvent) =>
              rangeClipped &&
              tooltipAt(e, "A few extreme values share the end colors, so the rest are easier to tell apart.")
            }
            onMouseMove={moveTooltip}
            onMouseLeave={() => onTooltip(null)}
          />
          <div className="mt-1 flex justify-between gap-2 text-gray-500">
            {extremes ? (
              <>
                <span className="whitespace-nowrap">Best {metric.format(extremes.best)}</span>
                <span className="whitespace-nowrap">Worst {metric.format(extremes.worst)}</span>
              </>
            ) : (
              <span>{NOT_MEASURED}</span>
            )}
          </div>
        </li>
        {metric.threshold && (
          <LegendItem
            data-legend="degraded"
            swatch={<span className={`${cellSwatch} border-gray-200 bg-gray-100`} style={{ boxShadow: DEGRADED_RING }} />}
          >
            {metric.threshold.label} ({degradedCount})
          </LegendItem>
        )}
        <LegendItem swatch={<span className={`${cellSwatch} border-dashed border-purple-400 bg-purple-200`} />}>
          {NOT_MEASURED}
        </LegendItem>
        <LegendItem swatch={<span className={`${cellSwatch} border-dashed border-gray-300`} />}>Absent</LegendItem>
      </LegendGroup>

      <LegendGroup title="Couplers">
        <LegendItem swatch={<CouplerSwatch band="good" />}>Under {pct(CZ_ERROR_BANDS.goodBelow)} error</LegendItem>
        <LegendItem swatch={<CouplerSwatch band="warn" />}>
          {+(CZ_ERROR_BANDS.goodBelow * 100).toFixed(2)} to {pct(CZ_ERROR_BANDS.warnUpTo)} error
        </LegendItem>
        <LegendItem swatch={<CouplerSwatch band="bad" />}>Over {pct(CZ_ERROR_BANDS.warnUpTo)} error</LegendItem>
        <LegendItem swatch={<CouplerSwatch band="uncalibrated" />}>{NOT_MEASURED}</LegendItem>
      </LegendGroup>

      <LegendGroup title="Between chiplets">
        <LegendItem
          swatch={<span className="h-3 w-5 rounded-sm" style={{ background: GRADIENT_CSS, opacity: CORRIDOR_FILL_OPACITY + 0.15 }} />}
        >
          Link quality
        </LegendItem>
        <LegendItem
          swatch={<span className="h-3 w-5 rounded-sm border-[1.5px] border-dashed" style={{ borderColor: UNSCORED_CORRIDOR_COLOR }} />}
        >
          {NOT_MEASURED}
        </LegendItem>
      </LegendGroup>

      <LegendGroup>
        <LegendItem
          data-legend="stale"
          swatch={<span className={`${cellSwatch} border-[#27728B] bg-[#27728B]`} style={{ opacity: STALE_OPACITY }} />}
        >
          Older than {formatHours(METRIC_STALE_AFTER_SECONDS)}
        </LegendItem>
      </LegendGroup>
    </div>
  );

  return (
    <div className="default-radius border-2 border-gray-50 bg-white p-4">
      <div className="mb-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="block text-md font-semibold text-gray-400">Processor map</h2>
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
        {!layoutConfirmed && (
          <p className="text-xs text-amber-700">
            Rigetti has not confirmed which qubits belong to which chiplet. The chiplet layout is our estimate.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="relative mx-auto max-w-md" ref={mapWrapRef}>
            <div
              className="relative grid gap-4 p-3"
              style={{
                gridTemplateColumns: `repeat(${lattice?.chipletArrayCols ?? FALLBACK_CHIPLET_GRID_COLS}, 1fr)`,
              }}
            >
              {chipletIds.map((chipletId) => {
                const chipletQubits = qubitsByChiplet.get(chipletId) ?? [];
                const activeCount = chipletQubits.filter((q) => q.presence !== "absent").length;
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
                      const extra = {
                        ...(isDegraded(q, metric) ? { boxShadow: DEGRADED_RING } : {}),
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
              {/* Links first and translucent; couplers cross them on top. */}
              {overlay.corridors.map(({ corridor, band }) => {
                // Not measured is an outline with no fill: a translucent fill
                // from the purple (low-score) end of the gradient would look
                // the same as a lavender fill.
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
                          ? `<b>Link ${corridor.corridorId}</b><br/>${NOT_MEASURED}`
                          : `<b>Link ${corridor.corridorId}</b><br/>Score ${formatPct(corridor.score)}<br/>${corridor.validLinks} of ${corridor.expectedLinks} couplers measured`,
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
                const length = Math.hypot(segment.x2 - segment.x1, segment.y2 - segment.y1);
                return (
                  <g key={key}>
                    {selected && (
                      <line {...segment} stroke={SELECTED_STROKE} strokeWidth={style.width + 3} strokeLinecap="round" />
                    )}
                    {/* Butt caps on every coupler, so dashed and solid lines
                        cover exactly the same gap. */}
                    <line
                      {...segment}
                      data-band={band}
                      stroke={style.stroke}
                      strokeWidth={style.width}
                      strokeDasharray={style.dash ? fittedDash(length, style.dash) : undefined}
                      strokeLinecap="butt"
                      strokeOpacity={isStaleMetric(edge.cz, ageRef) ? STALE_OPACITY : undefined}
                    />
                    {/* Invisible, wider hit target: the visible stroke is too thin to hover reliably. */}
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
        {legend}
      </div>
    </div>
  );
}
