"use client";

import ChipletStreamCard from "./ChipletStreamCard";
import { DetailRow } from "./DetailRow";
import type { EntropyPoolEntry, WithdrawResponse } from "./types";

// rigetti-proxy's cross_chiplet_correlation() returns a pairwise phi-
// coefficient table and max_abs_correlation, but no explicit "significant"
// boolean -- there is nothing upstream to key off of. This threshold is a
// UI-side judgment call, not an API-asserted flag: surfaced as a visible
// callout above that threshold, but the correlation note/numbers are shown
// either way, every time, regardless of this heuristic.
const NOTABLE_CORRELATION_THRESHOLD = 0.05;

export default function WithdrawResultPanel({
  result,
  poolByChiplet,
  onSelectAlternative,
}: {
  result: WithdrawResponse;
  poolByChiplet: Record<string, EntropyPoolEntry>;
  onSelectAlternative: (chipletId: string) => void;
}) {
  if (result.insufficient) {
    const ins = result.insufficient;
    return (
      <div className="default-radius border border-blue-100 bg-blue-50 p-4 text-sm">
        <div className="font-medium text-blue-900">
          {ins.chiplet_id} doesn&apos;t have enough bits for this request
        </div>
        <div className="mt-1 text-blue-800">
          Requested {ins.requested.toLocaleString()} bits, {ins.available.toLocaleString()} available. Nothing was
          withdrawn from any chiplet in this request.
        </div>
        {ins.alternatives.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-xs font-medium text-blue-900">Chiplets with enough bits:</div>
            <div className="flex flex-wrap gap-2">
              {ins.alternatives.map((alt) => (
                <button
                  key={alt.chiplet_id}
                  type="button"
                  onClick={() => onSelectAlternative(alt.chiplet_id)}
                  className="default-radius cursor-pointer border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100"
                >
                  {alt.chiplet_id} — {alt.available_bits.toLocaleString()} bits
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const notableCorrelation =
    result.correlation != null && result.correlation.max_abs_correlation > NOTABLE_CORRELATION_THRESHOLD;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="block text-md font-semibold text-gray-400">Withdrawal result</h2>

      {/* Single column, not sm:grid-cols-2 -- this now renders inside the
          narrow configure/submit panel (see QEntropyExperiment), not full
          page width, so a viewport-width breakpoint would force a cramped
          2-up layout regardless of the panel's actual space. */}
      <div className="grid grid-cols-1 gap-3">
        {result.chiplets.map((stream) => (
          <ChipletStreamCard key={stream.withdrawal_id ?? stream.chiplet_id} stream={stream} poolSnapshot={poolByChiplet[stream.chiplet_id]} />
        ))}
      </div>

      {result.combined_stream && (
        <div>
          <div className="mb-2 text-sm font-semibold text-gray-700">Combined stream (XOR)</div>
          <ChipletStreamCard stream={result.combined_stream} label={result.combined_stream.chiplet_id} />
        </div>
      )}

      {result.correlation && (
        <div className="default-radius bg-gray-50 p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-base font-semibold text-gray-900">Cross-chiplet correlation</span>
            {notableCorrelation && (
              <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-2xs font-medium text-amber-700">
                Notable
              </span>
            )}
          </div>
          <p className="mb-2 text-xs text-gray-500">{result.correlation.note}</p>
          <DetailRow
            label="Pairwise correlation"
            value={
              <span className="flex flex-wrap justify-end gap-x-3 font-mono text-xs">
                {result.correlation.pairwise.map((p, i) => (
                  <span key={i}>
                    {p.chiplet_a}×{p.chiplet_b}: {p.correlation.toFixed(4)}
                  </span>
                ))}
              </span>
            }
          />
          <DetailRow label="Max |correlation|" value={result.correlation.max_abs_correlation.toFixed(4)} />
        </div>
      )}
    </div>
  );
}
