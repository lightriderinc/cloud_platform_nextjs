import type { ReactNode } from "react";
import type { ChipletSummary, QubitExtreme } from "@/lib/topology/chipletSummary";
import type { EdgeEntry, Metric, MetricState } from "@/lib/topology/client";
import {
  formatDuration,
  formatDurationNs,
  formatHours,
  formatMeasuredAge,
  formatMetricValue,
  formatPct,
  formatPctErrorBar,
  formatSeconds,
  formatSecondsErrorBar,
  NOT_MEASURED,
} from "@/lib/topology/format";
import {
  couplerBand,
  DEGRADED_THRESHOLDS,
  isDegraded,
  isStaleAge,
  METRIC_STALE_AFTER_SECONDS,
  metricAgeSeconds,
  QUBIT_MAP_METRICS,
  type AgeReference,
} from "@/lib/topology/thresholds";
import { StateBadge } from "./stateStyles";
import type { Selection } from "./types";

const OLDER_THAN = `Older than ${formatHours(METRIC_STALE_AFTER_SECONDS)}.`;

/** Readout and CZ are shown as error rates everywhere on this page, matching the map. */
function asError(m: Metric): Metric {
  return { ...m, value: m.value === null ? null : 1 - m.value };
}

function isMeasured(m: Metric): boolean {
  return m.state === "active" || m.state === "degraded";
}

function MetricRow({
  label,
  metric,
  format,
  formatErrorBar,
  belowThreshold = false,
  ageRef,
}: {
  label: string;
  metric: Metric;
  format: (v: number | null) => string;
  formatErrorBar: (e: number) => string;
  /** Adds a "Below threshold" badge, by the same rule as the map's ring. */
  belowThreshold?: boolean;
  ageRef: AgeReference | null;
}) {
  const measured = isMeasured(metric);
  const age = measured ? metricAgeSeconds(metric.measuredAt, ageRef) : null;
  const stale = isStaleAge(age);
  // The value already says "Not measured"; a badge only appears when it
  // adds something.
  const badge: MetricState | null = belowThreshold || metric.state === "degraded" ? "degraded" : null;
  return (
    <div
      className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-gray-100 py-2 text-sm last:border-0"
      data-stale={stale || undefined}
    >
      <span className="font-medium text-gray-700">{label}</span>
      {badge ? <StateBadge state={badge} /> : <span />}
      <span className={stale ? "text-gray-400" : "text-gray-900"}>{formatMetricValue(metric, format)}</span>
      <span className="text-xs text-gray-400">
        {measured && metric.error !== null ? formatErrorBar(metric.error) : ""}
      </span>
      {measured && (
        <span className={`col-span-2 text-xs ${stale ? "text-amber-700" : "text-gray-400"}`}>
          {formatMeasuredAge(age)}
          {stale && `. ${OLDER_THAN}`}
        </span>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-gray-100 py-2 text-sm last:border-0">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="text-right text-gray-900">{value}</span>
    </div>
  );
}

/** A value that links to the qubit or coupler it names. */
function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="brand-link cursor-pointer text-right">
      {children}
    </button>
  );
}

function BelowThreshold({ show }: { show: boolean }) {
  return show ? <span className="block text-xs text-amber-700">Below threshold</span> : null;
}

function QubitExtremeRow({
  label,
  extreme,
  format,
  below,
  onSelect,
}: {
  label: string;
  extreme: QubitExtreme | null;
  format: (v: number) => string;
  below?: boolean;
  onSelect: (s: Selection) => void;
}) {
  return (
    <SummaryRow
      label={label}
      value={
        extreme ? (
          <>
            <LinkButton onClick={() => onSelect({ kind: "qubit", qubit: extreme.qubit })}>
              q{extreme.qubitIndex}, {format(extreme.value)}
            </LinkButton>
            <BelowThreshold show={!!below} />
          </>
        ) : (
          NOT_MEASURED
        )
      }
    />
  );
}

/** "4 hours ago" or "4 hours to 2 days ago" across the chiplet's measured values. */
function DataAge({ summary, ageRef }: { summary: ChipletSummary; ageRef: AgeReference | null }) {
  const newest = metricAgeSeconds(summary.newestMeasuredAt, ageRef);
  const oldest = metricAgeSeconds(summary.oldestMeasuredAt, ageRef);
  if (newest === null || oldest === null) return <span className="text-gray-400">Not recorded</span>;
  const stale = isStaleAge(oldest);
  const span =
    formatDuration(newest) === formatDuration(oldest)
      ? `${formatDuration(newest)} ago`
      : `${formatDuration(newest)} to ${formatDuration(oldest)} ago`;
  return (
    <span className={stale ? "text-amber-700" : undefined} data-stale={stale || undefined}>
      {span}
      {stale && <span className="block text-xs">Some values are older than {formatHours(METRIC_STALE_AFTER_SECONDS)}.</span>}
    </span>
  );
}

function ChipletSummaryContent({
  summary,
  ageRef,
  onSelect,
}: {
  summary: ChipletSummary;
  ageRef: AgeReference | null;
  onSelect: (s: Selection) => void;
}) {
  const { intraCouplers: intra, boundaryCouplers: boundary, worstCoupler, worstBoundaryCoupler: worstBoundary } = summary;
  const frb = summary.frbSimultaneous;
  const unmeasuredCouplers = intra.total - intra.calibrated + (boundary.total - boundary.calibrated);
  return (
    <div data-chiplet-summary={summary.chipletId}>
      <div className="mb-1 text-base font-semibold text-gray-900">Chiplet {summary.chipletId}</div>
      <p className="mb-2 text-xs text-gray-500">
        {summary.qubitCount} qubits
        {summary.absentQubits.length > 0 && `, ${summary.absentQubits.map((i) => `q${i}`).join(", ")} absent`}
      </p>
      <SummaryRow label="Couplers measured" value={`${intra.calibrated} of ${intra.total}`} />
      <SummaryRow
        label="Worst coupler"
        value={
          worstCoupler ? (
            <>
              <LinkButton onClick={() => onSelect({ kind: "edge", edge: worstCoupler.edge })}>
                q{worstCoupler.edge.nodeA}-q{worstCoupler.edge.nodeB}, {formatPct(worstCoupler.czError)} error
              </LinkButton>
              <BelowThreshold show={couplerBand(worstCoupler.edge) === "bad"} />
            </>
          ) : (
            NOT_MEASURED
          )
        }
      />
      {/* Couplers to other chiplets belong to links, so they're a secondary
          line, not part of the chiplet's own "worst". */}
      {boundary.total > 0 && (
        <div className="border-b border-gray-100 py-2 text-xs text-gray-500" data-summary="boundary">
          <p>
            Couplers to other chiplets: {boundary.calibrated} of {boundary.total} measured
          </p>
          {worstBoundary && (
            <p>
              Worst{" "}
              <LinkButton onClick={() => onSelect({ kind: "edge", edge: worstBoundary.edge })}>
                q{worstBoundary.edge.nodeA}-q{worstBoundary.edge.nodeB}, {formatPct(worstBoundary.czError)} error
              </LinkButton>
              {worstBoundary.edge.corridorId && ` on link ${worstBoundary.edge.corridorId}`}
              {couplerBand(worstBoundary.edge) === "bad" && <span className="text-amber-700">. Below threshold</span>}
            </p>
          )}
        </div>
      )}
      <QubitExtremeRow
        label="Highest readout error"
        extreme={summary.worstReadout && { ...summary.worstReadout, value: 1 - summary.worstReadout.value }}
        format={(v) => formatPct(v)}
        below={!!summary.worstReadout && summary.worstReadout.value < DEGRADED_THRESHOLDS.readoutFidelity}
        onSelect={onSelect}
      />
      <QubitExtremeRow label="Lowest T1" extreme={summary.lowestT1} format={formatSeconds} onSelect={onSelect} />
      <QubitExtremeRow label="Lowest T2*" extreme={summary.lowestT2Star} format={formatSeconds} onSelect={onSelect} />
      <SummaryRow
        label="Average 1Q fidelity"
        value={
          <>
            {formatPct(frb.mean)}
            <span className="block text-xs text-gray-400">
              {frb.measuredCount} of {frb.measuredCount + frb.sentinelCount} qubits measured
            </span>
          </>
        }
      />
      <SummaryRow label="Last measured" value={<DataAge summary={summary} ageRef={ageRef} />} />
      {unmeasuredCouplers > 0 && (
        <p className="mt-2 text-xs text-gray-500">Couplers that are not measured are left out of &ldquo;worst&rdquo;.</p>
      )}
    </div>
  );
}

function DetailPanelContent({
  selection,
  edges,
  chipletSummaries,
  ageRef,
  onSelect,
}: {
  selection: Selection;
  edges: EdgeEntry[];
  chipletSummaries: Map<string, ChipletSummary>;
  ageRef: AgeReference | null;
  onSelect: (s: Selection) => void;
}) {
  if (selection.kind === "chiplet") {
    const summary = chipletSummaries.get(selection.chipletId);
    return summary ? (
      <ChipletSummaryContent summary={summary} ageRef={ageRef} onSelect={onSelect} />
    ) : (
      <p className="text-sm text-gray-400">Chiplet {selection.chipletId} has no qubits.</p>
    );
  }

  if (selection.kind === "qubit") {
    const q = selection.qubit;
    const [frbMetric, readoutMetric] = QUBIT_MAP_METRICS;
    return (
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-base font-semibold text-gray-900">Qubit q{q.qubitIndex}</span>
          {q.presence === "absent" && <StateBadge state="absent" />}
        </div>
        <p className="mb-2 text-xs text-gray-500">Chiplet {q.chipletId ?? "unknown"}</p>
        {q.presence === "absent" ? (
          <p className="text-sm text-gray-500">This qubit is not available on this chip.</p>
        ) : (
          <>
            <MetricRow
              label="1Q fidelity"
              metric={q.frbSimultaneous}
              format={formatPct}
              formatErrorBar={formatPctErrorBar}
              belowThreshold={isDegraded(q, frbMetric)}
              ageRef={ageRef}
            />
            <MetricRow
              label="Readout error"
              metric={asError(q.readout)}
              format={formatPct}
              formatErrorBar={formatPctErrorBar}
              belowThreshold={isDegraded(q, readoutMetric)}
              ageRef={ageRef}
            />
            <MetricRow label="T1" metric={q.t1} format={formatSeconds} formatErrorBar={formatSecondsErrorBar} ageRef={ageRef} />
            {/* Rigetti's "T2" is benchmark:FreeInductionDecay, a Ramsey T2*, not echo T2. */}
            <MetricRow label="T2*" metric={q.t2} format={formatSeconds} formatErrorBar={formatSecondsErrorBar} ageRef={ageRef} />
            {/* 1Q fidelity above is measured with all qubits driven at once;
                this one with the qubit driven alone, so it's usually higher. */}
            <MetricRow
              label="1Q fidelity (isolated)"
              metric={q.frbIsolated}
              format={formatPct}
              formatErrorBar={formatPctErrorBar}
              ageRef={ageRef}
            />
            <p className="mt-2 text-xs text-gray-500">RX gate time: {formatDurationNs(q.rxDurationNs)}</p>
          </>
        )}
      </div>
    );
  }

  if (selection.kind === "edge") {
    const e = selection.edge;
    return (
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-base font-semibold text-gray-900">
            Coupler q{e.nodeA}-q{e.nodeB}
          </span>
          {e.presence === "absent" && <StateBadge state="absent" />}
        </div>
        <p className="mb-2 text-xs text-gray-500">
          {e.corridorId ? `On link ${e.corridorId}` : `Inside chiplet ${e.chipletA ?? "unknown"}`}
        </p>
        <MetricRow
          label="CZ error"
          metric={asError(e.cz)}
          format={formatPct}
          formatErrorBar={formatPctErrorBar}
          belowThreshold={couplerBand(e) === "bad"}
          ageRef={ageRef}
        />
        <p className="mt-2 text-xs text-gray-500">CZ gate time: {formatDurationNs(e.czDurationNs)}</p>
        {e.cz.state === "sentinel" && e.hasCalibration && (
          <p className="mt-1 text-xs text-gray-500">Rigetti has tuned this coupler but has not measured it.</p>
        )}
      </div>
    );
  }

  const c = selection.corridor;
  const notMeasured = c.score === null;
  const couplers = edges.filter((e) => e.corridorId === c.corridorId);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-base font-semibold text-gray-900">Chiplet link {c.corridorId}</span>
        {notMeasured && <StateBadge state="sentinel" />}
      </div>
      <div>
        <SummaryRow label="Score" value={formatPct(c.score)} />
        <SummaryRow label="Couplers measured" value={`${c.validLinks} of ${c.expectedLinks}`} />
        <SummaryRow label="Average CZ error" value={formatPct(c.meanFcz === null ? null : 1 - c.meanFcz)} />
        <SummaryRow
          label="Best coupler"
          value={
            c.bestLink && c.bestLinkFcz !== null
              ? `q${c.bestLink[0]}-q${c.bestLink[1]}, ${formatPct(1 - c.bestLinkFcz)} error`
              : NOT_MEASURED
          }
        />
      </div>
      {c.missingLinks > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          {c.missingLinks === 1 ? "1 coupler is" : `${c.missingLinks} couplers are`} not available on this chip.
        </p>
      )}
      {couplers.length > 0 && (
        <>
          <p className="mt-3 mb-1 text-xs font-medium text-gray-500">Couplers</p>
          <div className="flex flex-col gap-1">
            {couplers.map((e) => (
              <button
                key={`${e.nodeA}-${e.nodeB}`}
                type="button"
                onClick={() => onSelect({ kind: "edge", edge: e })}
                className="grid grid-cols-[1fr_auto_5rem] items-center gap-2 rounded border border-gray-100 px-2 py-1 text-left text-xs hover:border-gray-300"
              >
                <span>
                  q{e.nodeA}-q{e.nodeB}
                </span>
                {couplerBand(e) === "bad" ? <StateBadge state="degraded" /> : <span />}
                <span className="text-right">{formatMetricValue(asError(e.cz), formatPct)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// DETAIL PANEL: sticky, always visible, not below the fold.
export default function TopologyDetailPanel({
  selection,
  edges,
  chipletSummaries,
  ageRef,
  onSelect,
}: {
  selection: Selection | null;
  edges: EdgeEntry[];
  chipletSummaries: Map<string, ChipletSummary>;
  ageRef: AgeReference | null;
  onSelect: (s: Selection) => void;
}) {
  return (
    <aside className="default-radius bg-gray-50 p-4 lg:sticky lg:top-0 lg:self-start">
      <h2 className="block text-md font-semibold text-gray-400 mb-3">Details</h2>
      {selection ? (
        <DetailPanelContent
          selection={selection}
          edges={edges}
          chipletSummaries={chipletSummaries}
          ageRef={ageRef}
          onSelect={onSelect}
        />
      ) : (
        <p className="text-sm text-gray-400">Select a qubit, coupler, chiplet or link on the map to see its details.</p>
      )}
    </aside>
  );
}
