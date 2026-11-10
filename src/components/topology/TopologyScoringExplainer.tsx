import { formatHours } from "@/lib/topology/format";
import { CZ_ERROR_BANDS, DEGRADED_THRESHOLDS, METRIC_STALE_AFTER_SECONDS } from "@/lib/topology/thresholds";

const pct = (v: number) => `${+(v * 100).toFixed(2)}%`;

// Numbers come from thresholds.ts, so this text can't drift from what the
// map actually does.
export default function TopologyScoringExplainer() {
  return (
    <details className="default-radius border border-gray-100 bg-white p-4" data-scoring-explainer>
      <summary className="cursor-pointer text-sm font-medium text-gray-700">How this is scored</summary>
      <div className="mt-3 flex flex-col gap-3 text-xs leading-relaxed text-gray-600">
        <div>
          <p className="font-medium text-gray-700">Chiplet link score</p>
          <p>
            Average CZ fidelity of the link&apos;s couplers, multiplied by the share of its couplers that are
            measured. A link with three good couplers outranks a link with one excellent coupler and two that
            are not measured.
          </p>
        </div>
        <div>
          <p className="font-medium text-gray-700">Coupler colors</p>
          <p>
            Each coupler is colored by its CZ error: green under {pct(CZ_ERROR_BANDS.goodBelow)}, amber{" "}
            {+(CZ_ERROR_BANDS.goodBelow * 100).toFixed(2)} to {pct(CZ_ERROR_BANDS.warnUpTo)}, red over{" "}
            {pct(CZ_ERROR_BANDS.warnUpTo)}.
          </p>
        </div>
        <div>
          <p className="font-medium text-gray-700">Below threshold</p>
          <p>
            A qubit gets an amber ring when its 1Q fidelity is under {pct(DEGRADED_THRESHOLDS.singleQubitFidelity)} or
            its readout error is over {pct(1 - DEGRADED_THRESHOLDS.readoutFidelity)}. A coupler is below threshold
            when its CZ error is over {pct(1 - DEGRADED_THRESHOLDS.czFidelity)}. T1 and T2* have no threshold.
          </p>
        </div>
        <div>
          <p className="font-medium text-gray-700">Not measured</p>
          <p>
            A qubit, coupler or link marked Not measured has no current result from Rigetti. It is not counted
            as bad, and it is left out of averages, scores and rankings. Values older than{" "}
            {formatHours(METRIC_STALE_AFTER_SECONDS)} are faded.
          </p>
        </div>
      </div>
    </details>
  );
}
