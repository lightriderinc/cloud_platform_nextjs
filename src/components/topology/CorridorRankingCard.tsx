import type { CorridorEntry, CorridorsData } from "@/lib/topology/client";
import { formatFidelityPct } from "@/lib/topology/format";
import { scoreColor } from "./errorGradient";
import type { Selection } from "./types";

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
  const tickPct = corridor.bestLinkFcz === null ? null : corridor.bestLinkFcz * 100;
  return (
    <button
      type="button"
      onClick={() => onSelect({ kind: "corridor", corridor })}
      className="grid w-full grid-cols-[64px_1fr_64px_44px_120px] items-center gap-3 px-1 py-1 text-left hover:bg-gray-50"
    >
      <span className="text-sm font-medium text-gray-800">{corridor.corridorId}</span>
      <span className="relative h-3.5 overflow-hidden rounded bg-gray-100">
        <span
          className="absolute inset-y-0 left-0 rounded"
          style={{
            width: `${barPct}%`,
            backgroundColor:
              corridor.score === null ? undefined : scoreColor(corridor.score, scoreRange),
          }}
        />
        {tickPct !== null && (
          <span className="absolute inset-y-0 w-0.5 bg-gray-700" style={{ left: `${tickPct}%` }} />
        )}
      </span>
      <span className="text-right text-sm font-medium text-gray-900">
        {corridor.score === null ? "not measured" : `${(corridor.score * 100).toFixed(2)}%`}
      </span>
      <span className="text-right text-xs text-gray-400">
        {corridor.validLinks}/{corridor.expectedLinks}
      </span>
      <span className="text-right text-xs text-gray-400">
        {corridor.bestLink ? `q${corridor.bestLink[0]}-q${corridor.bestLink[1]} ` : ""}
        {formatFidelityPct(corridor.bestLinkFcz, 2)}
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
      <h2 className="block text-md font-semibold text-gray-400 mb-6">
        Corridor ranking — score (mean fCZ × coverage)
      </h2>
      {corridors && (
        <>
          <div className="grid grid-cols-[64px_1fr_64px_44px_120px] gap-3 border-b border-gray-100 pb-1.5 text-xs font-medium tracking-wide text-gray-700">
            <span>Corridor</span>
            <span>Score</span>
            <span className="text-right">Score %</span>
            <span className="text-right">Cov.</span>
            <span className="text-right">Best link</span>
          </div>
          <div className="flex flex-col divide-y divide-gray-50">
            {corridors.ranked.map((c) => (
              <RankRow key={c.corridorId} corridor={c} scoreRange={scoreRange} onSelect={onSelect} />
            ))}
          </div>

          {corridors.unranked.length > 0 && (
            <div className="mt-4 rounded border border-dashed border-purple-300 bg-purple-50/40 p-3">
              <p className="mb-2 text-xs font-medium text-purple-700">
                Uncharacterized corridors excluded from ranking
              </p>
              {corridors.unranked.map((c) => (
                <button
                  key={c.corridorId}
                  type="button"
                  onClick={() => onSelect({ kind: "corridor", corridor: c })}
                  className="flex w-full items-center justify-between gap-3 rounded px-1 py-1 text-left hover:bg-purple-50"
                >
                  <span className="text-sm font-medium text-gray-800">{c.corridorId}</span>
                  <span className="text-xs text-gray-500">not measured</span>
                  <span className="text-xs text-gray-500">
                    {c.validLinks}/{c.expectedLinks}
                  </span>
                  <span className="text-xs text-purple-700">
                    {c.sentinelLinks} link(s) sentinel — unmeasured, not blocked
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
