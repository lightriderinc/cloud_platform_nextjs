import type { EdgeEntry, Metric } from "@/lib/topology/client";
import {
  formatDurationNs,
  formatFidelityPct,
  formatMetricValue,
  formatScore,
  formatSeconds,
} from "@/lib/topology/format";
import { StateBadge } from "./stateStyles";
import type { Selection } from "./types";

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

function DetailPanelContent({
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

// DETAIL PANEL — sticky, always visible, not below the fold.
export default function TopologyDetailPanel({
  selection,
  edges,
  onSelect,
}: {
  selection: Selection | null;
  edges: EdgeEntry[];
  onSelect: (s: Selection) => void;
}) {
  return (
    <aside className="default-radius bg-gray-50 p-4 lg:sticky lg:top-0 lg:self-start">
      <h2 className="block text-md font-semibold text-gray-400 mb-3">Detail</h2>
      {selection ? (
        <DetailPanelContent selection={selection} edges={edges} onSelect={onSelect} />
      ) : (
        <p className="text-sm text-gray-400">
          Click a chiplet, qubit, or corridor to see its full detail here.
        </p>
      )}
    </aside>
  );
}
