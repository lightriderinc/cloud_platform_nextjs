"use client";

import ChipletStreamCard from "./ChipletStreamCard";
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <div
          className={`default-radius border p-4 text-sm ${
            notableCorrelation ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-gray-50"
          }`}
        >
          <div className={`font-medium ${notableCorrelation ? "text-amber-900" : "text-gray-700"}`}>
            Cross-chiplet correlation{notableCorrelation ? " — notable" : ""}
          </div>
          <div className={`mt-1 ${notableCorrelation ? "text-amber-800" : "text-gray-600"}`}>
            {result.correlation.note}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            {result.correlation.pairwise.map((p, i) => (
              <span key={i} className="font-mono text-gray-600">
                {p.chiplet_a}×{p.chiplet_b}: {p.correlation.toFixed(4)}
              </span>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Max |correlation|: {result.correlation.max_abs_correlation.toFixed(4)}
          </div>
        </div>
      )}
    </div>
  );
}
