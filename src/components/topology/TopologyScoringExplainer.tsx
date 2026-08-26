export default function TopologyScoringExplainer() {
  return (
    <details className="default-radius border border-gray-100 bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium text-gray-700">
        How this is scored
      </summary>
      <div className="mt-2 flex flex-col gap-2 text-xs text-gray-600">
        <p>
          Corridor score = mean CZ fidelity × coverage (valid links / expected links).
          Coverage-weighting is deliberate: a corridor with one excellent link and two
          sentinels must not outrank one with three good links.
        </p>
        <p>
          Best-link fidelity is shown as a secondary marker only — never as the sort key.
          &ldquo;Best coupler&rdquo; in the top strip and &ldquo;best corridor&rdquo; can
          legitimately name different corridors; that gap is the reason for scoring this
          way rather than by best link alone.
        </p>
        <p>
          A sentinel record means uncharacterized, not bad — it is never treated as low
          quality or sorted among genuinely poor hardware.
        </p>
      </div>
    </details>
  );
}
