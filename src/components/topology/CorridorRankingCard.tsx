import type { CorridorEntry, CorridorsData } from "@/lib/topology/client";
import { formatPct, NOT_MEASURED } from "@/lib/topology/format";
import { scoreColor } from "./errorGradient";
import type { Selection } from "./types";

const COLUMNS = "grid-cols-[64px_1fr_64px_72px_140px]";

function RankRow({
  corridor,
  scoreRange,
  onSelect,
}: {
  corridor: CorridorEntry;
  scoreRange: { lo: number; hi: number };
  onSelect: (s: Selection) => void;
}) {
  const barPct = corridor.score === null ? 0 : Math.max(1, corridor.score * 100);
  return (
    <button
      type="button"
      onClick={() => onSelect({ kind: "corridor", corridor })}
      className={`grid w-full ${COLUMNS} items-center gap-3 px-1 py-1 text-left hover:bg-gray-50`}
    >
      <span className="text-sm font-medium text-gray-800">{corridor.corridorId}</span>
      <span className="relative h-3.5 overflow-hidden rounded bg-gray-100">
        <span
          className="absolute inset-y-0 left-0 rounded"
          style={{
            width: `${barPct}%`,
            backgroundColor: corridor.score === null ? undefined : scoreColor(corridor.score, scoreRange),
          }}
        />
      </span>
      <span className="text-right text-sm font-medium text-gray-900">{formatPct(corridor.score)}</span>
      <span className="text-right text-xs text-gray-500">
        {corridor.validLinks} of {corridor.expectedLinks}
      </span>
      <span className="text-right text-xs text-gray-500">
        {corridor.bestLink && corridor.bestLinkFcz !== null
          ? `q${corridor.bestLink[0]}-q${corridor.bestLink[1]}, ${formatPct(1 - corridor.bestLinkFcz)}`
          : NOT_MEASURED}
      </span>
    </button>
  );
}

export default function CorridorRankingCard({
  corridors,
  scoreRange,
  onSelect,
}: {
  corridors: CorridorsData | undefined;
  scoreRange: { lo: number; hi: number };
  onSelect: (s: Selection) => void;
}) {
  return (
    <div className="default-radius border-2 border-gray-50 bg-white p-4">
      <h2 className="mb-6 block text-md font-semibold text-gray-400">Chiplet links, ranked by score</h2>
      {corridors && (
        <>
          {/* Fixed-width columns: scroll sideways on narrow screens rather than clip "Best coupler". */}
          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              <div className={`grid ${COLUMNS} gap-3 border-b border-gray-100 pb-1.5 text-xs font-medium tracking-wide text-gray-700`}>
                <span>Link</span>
                <span>Score</span>
                <span />
                <span className="text-right">Measured</span>
                <span className="text-right">Best coupler error</span>
              </div>
              <div className="flex flex-col divide-y divide-gray-50">
                {corridors.ranked.map((c) => (
                  <RankRow key={c.corridorId} corridor={c} scoreRange={scoreRange} onSelect={onSelect} />
                ))}
              </div>
            </div>
          </div>

          {corridors.unranked.length > 0 && (
            <div className="mt-4 rounded border border-dashed border-purple-300 bg-purple-50/40 p-3">
              <p className="mb-2 text-xs font-medium text-purple-700">Not measured, so not ranked</p>
              {corridors.unranked.map((c) => (
                <button
                  key={c.corridorId}
                  type="button"
                  onClick={() => onSelect({ kind: "corridor", corridor: c })}
                  className="flex w-full items-center justify-between gap-3 rounded px-1 py-1 text-left hover:bg-purple-50"
                >
                  <span className="text-sm font-medium text-gray-800">{c.corridorId}</span>
                  <span className="text-xs text-gray-500">
                    {c.validLinks} of {c.expectedLinks} couplers measured
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
