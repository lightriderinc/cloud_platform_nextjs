import type { ReactNode } from "react";
import type { ChipletSummary, QubitExtreme } from "@/lib/topology/chipletSummary";
import type { EdgeEntry, Metric } from "@/lib/topology/client";
import {
  formatDurationNs,
  formatFidelityPct,
  formatHours,
  formatMeasuredAge,
  formatMetricValue,
  formatScore,
  formatSeconds,
} from "@/lib/topology/format";
import {
  DEGRADED_THRESHOLDS,
  isStaleAge,
  METRIC_STALE_AFTER_SECONDS,
  metricAgeSeconds,
  type AgeReference,
} from "@/lib/topology/thresholds";
import { StateBadge } from "./stateStyles";
import type { Selection } from "./types";

function MetricRow({
  label,
  metric,
  formatter,
  ageRef,
}: {
  label: string;
  metric: Metric;
  formatter: (v: number | null) => string;
  ageRef: AgeReference | null;
}) {
  // Age only means something for a measured value — sentinel/absent have
  // no measurement to date.
  const measured = metric.state === "active" || metric.state === "degraded";
  const age = measured ? metricAgeSeconds(metric.measuredAt, ageRef) : null;
  const stale = isStaleAge(age);
  return (
    <div
      className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-gray-100 py-2 text-sm last:border-0"
      data-stale={stale || undefined}
    >
      <span className="font-medium text-gray-700">{label}</span>
      <StateBadge state={metric.state} />
      <span className={stale ? "text-gray-400" : "text-gray-900"}>{formatMetricValue(metric, formatter)}</span>
      <span className="text-xs text-gray-400">
        {/* Same formatter as the value: a T1 error of 1.8e-6 s is "± 1.80 µs", not "± 0.0000". */}
        {metric.error === null ? "no error reported" : `± ${formatter(metric.error)}`}
      </span>
      {measured && (
        <span className={`col-span-2 text-xs ${stale ? "text-amber-700" : "text-gray-400"}`}>
          {formatMeasuredAge(age)}
          {stale && ` — older than ${formatHours(METRIC_STALE_AFTER_SECONDS)}`}
        </span>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-gray-100 py-2 text-sm last:border-0">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="text-gray-900">{value}</span>
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

/** A summary line's value that links to the qubit/coupler it names. */
function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="brand-link cursor-pointer text-right">
      {children}
    </button>
  );
}

function BelowThreshold({ show }: { show: boolean }) {
  return show ? <span className="ml-1 text-xs text-amber-700">below threshold</span> : null;
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
              q{extreme.qubitIndex} · {format(extreme.value)}
            </LinkButton>
            <BelowThreshold show={!!below} />
          </>
        ) : (
          "not measured"
        )
      }
    />
  );
}

/** "measured 4h ago" / "measured 4h ago – measured 2d ago" across the chiplet's metrics; greyed past the stale limit. */
function DataAge({ summary, ageRef }: { summary: ChipletSummary; ageRef: AgeReference | null }) {
  const newest = metricAgeSeconds(summary.newestMeasuredAt, ageRef);
  const oldest = metricAgeSeconds(summary.oldestMeasuredAt, ageRef);
  if (newest === null || oldest === null) return <span className="text-gray-400">{formatMeasuredAge(null)}</span>;
  const stale = isStaleAge(oldest);
  const span =
    formatMeasuredAge(newest) === formatMeasuredAge(oldest)
      ? formatMeasuredAge(newest)
      : `${formatMeasuredAge(newest)} – ${formatMeasuredAge(oldest).replace(/^measured /, "")}`;
  return (
    <span className={stale ? "text-amber-700" : undefined} data-stale={stale || undefined}>
      {span}
      {stale && ` (some older than ${formatHours(METRIC_STALE_AFTER_SECONDS)})`}
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
  const {
    intraCouplers: intra,
    boundaryCouplers: boundary,
    worstCoupler,
    worstBoundaryCoupler: worstBoundary,
  } = summary;
  const pct2 = (v: number) => formatFidelityPct(v, 2);
  return (
    <div data-chiplet-summary={summary.chipletId}>
      <div className="mb-1 text-base font-semibold text-gray-900">Chiplet {summary.chipletId}</div>
      <p className="mb-2 text-xs text-gray-500">
        {summary.qubitCount} qubits
        {summary.absentQubits.length > 0 &&
          ` · ${summary.absentQubits.length} absent (${summary.absentQubits.map((i) => `q${i}`).join(", ")})`}
      </p>
      <SummaryRow label="Intra-chiplet couplers" value={`${intra.calibrated} of ${intra.total} calibrated`} />
      <SummaryRow
        label="Worst coupler"
        value={
          worstCoupler ? (
            <>
              <LinkButton onClick={() => onSelect({ kind: "edge", edge: worstCoupler.edge })}>
                q{worstCoupler.edge.nodeA}–q{worstCoupler.edge.nodeB} · CZ error {pct2(worstCoupler.czError)}
              </LinkButton>
              <BelowThreshold show={1 - worstCoupler.czError < DEGRADED_THRESHOLDS.czFidelity} />
            </>
          ) : (
            "none calibrated"
          )
        }
      />
      {/* Boundary couplers belong to corridors, so they're a secondary line,
          not part of the chiplet's own "worst". */}
      {boundary.total > 0 && (
        <p className="border-b border-gray-100 pb-2 text-xs text-gray-500" data-summary="boundary">
          Boundary: {boundary.calibrated} of {boundary.total} calibrated
          {worstBoundary && (
            <>
              {" · worst "}
              <LinkButton onClick={() => onSelect({ kind: "edge", edge: worstBoundary.edge })}>
                q{worstBoundary.edge.nodeA}–q{worstBoundary.edge.nodeB} {pct2(worstBoundary.czError)}
              </LinkButton>
              {worstBoundary.edge.corridorId && ` (${worstBoundary.edge.corridorId})`}
              <BelowThreshold show={1 - worstBoundary.czError < DEGRADED_THRESHOLDS.czFidelity} />
            </>
          )}
        </p>
      )}
      <QubitExtremeRow
        label="Worst readout"
        extreme={summary.worstReadout}
        format={pct2}
        below={!!summary.worstReadout && summary.worstReadout.value < DEGRADED_THRESHOLDS.readoutFidelity}
        onSelect={onSelect}
      />
      <QubitExtremeRow label="Lowest T1" extreme={summary.lowestT1} format={formatSeconds} onSelect={onSelect} />
      <QubitExtremeRow label="Lowest T2*" extreme={summary.lowestT2Star} format={formatSeconds} onSelect={onSelect} />
      <SummaryRow
        label="Mean fRB (simultaneous)"
        value={
          <span className="text-right">
            {formatFidelityPct(summary.frbSimultaneous.mean, 2)}
            <span className="block text-xs text-gray-400">
              {summary.frbSimultaneous.measuredCount} measured
              {summary.frbSimultaneous.sentinelCount > 0 && ` · ${summary.frbSimultaneous.sentinelCount} sentinel (excluded)`}
            </span>
          </span>
        }
      />
      <SummaryRow label="Data age" value={<DataAge summary={summary} ageRef={ageRef} />} />
      {intra.total - intra.calibrated + (boundary.total - boundary.calibrated) > 0 && (
        <p className="mt-2 text-xs text-purple-700">
          Uncalibrated couplers are unmeasured, not bad — they are left out of &ldquo;worst&rdquo;.
        </p>
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
      <p className="text-sm text-gray-400">No qubits on chiplet {selection.chipletId}.</p>
    );
  }

  if (selection.kind === "qubit") {
    const q = selection.qubit;
    return (
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-base font-semibold text-gray-900">Qubit q{q.qubitIndex}</span>
          <StateBadge state={q.presence} />
        </div>
        <p className="mb-2 text-xs text-gray-500">Chiplet {q.chipletId ?? "—"}</p>
        <MetricRow label="T1" metric={q.t1} formatter={formatSeconds} ageRef={ageRef} />
        {/* Rigetti's "T2" is benchmark:FreeInductionDecay — a Ramsey T2*, not echo T2. */}
        <MetricRow label="T2*" metric={q.t2} formatter={formatSeconds} ageRef={ageRef} />
        <MetricRow label="Readout fidelity" metric={q.readout} formatter={formatFidelityPct} ageRef={ageRef} />
        <MetricRow label="fRB — isolated (driven alone)" metric={q.frbIsolated} formatter={formatFidelityPct} ageRef={ageRef} />
        <MetricRow
          label="fRB — simultaneous (all 107, incl. crosstalk)"
          metric={q.frbSimultaneous}
          formatter={formatFidelityPct}
          ageRef={ageRef}
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
        <MetricRow label="CZ fidelity" metric={e.cz} formatter={formatFidelityPct} ageRef={ageRef} />
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
      <div>
        <SummaryRow
          label="Coverage"
          value={`${c.validLinks}/${c.expectedLinks} links (${(c.coverage * 100).toFixed(0)}%)`}
        />
        <SummaryRow label="Mean CZ fidelity" value={formatFidelityPct(c.meanFcz)} />
        <SummaryRow
          label="Best link fCZ (marker only)"
          value={
            <>
              {formatFidelityPct(c.bestLinkFcz)}
              {c.bestLink ? ` (q${c.bestLink[0]}–q${c.bestLink[1]})` : ""}
            </>
          }
        />
        <SummaryRow label="Score (mean fCZ × coverage)" value={formatScore(c.score)} />
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

// DETAIL PANEL — sticky, always visible, not below the fold.
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
      <h2 className="block text-md font-semibold text-gray-400 mb-3">Detail</h2>
      {selection ? (
        <DetailPanelContent
          selection={selection}
          edges={edges}
          chipletSummaries={chipletSummaries}
          ageRef={ageRef}
          onSelect={onSelect}
        />
      ) : (
        <p className="text-sm text-gray-400">
          Click a chiplet, qubit, or corridor to see its full detail here.
        </p>
      )}
    </aside>
  );
}
