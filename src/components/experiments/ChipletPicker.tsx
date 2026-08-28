"use client";

// Cepheus's fixed 3x4 modular layout (12 chiplets, 3 per row) -- the same
// convention topology/ProcessorMapCard.tsx renders. Kept as a local
// constant rather than importing that component: it's tightly coupled to
// topology-specific data/SVG-corridor rendering this multi-select picker
// has no use for.
export const CHIPLET_IDS = Array.from({ length: 12 }, (_, i) => `C${i + 1}`);
const GRID_COLS = 3;

export type ChipletTone = "positive" | "neutral" | "muted";

export interface ChipletCellState {
  selectable: boolean;
  primaryLabel: string;
  tone: ChipletTone;
}

const TONE_DOT: Record<ChipletTone, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-amber-400",
  muted: "bg-gray-300",
};

/**
 * Multi-select 3x4 chiplet grid. Deliberately dumb about WHY a cell is
 * selectable or what its label means -- the caller (pool-state-aware in
 * pool mode, candidate-quality-aware in live mode) computes one
 * ChipletCellState per chiplet and this component only renders it. A
 * chiplet absent from `cellState` entirely renders as not-yet-scored,
 * unselectable, and visually distinct from an error -- never a red/broken
 * treatment.
 */
export default function ChipletPicker({
  cellState,
  selected,
  onToggle,
  loading,
}: {
  cellState: Record<string, ChipletCellState>;
  selected: string[];
  onToggle: (chipletId: string) => void;
  loading?: boolean;
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)` }}
    >
      {CHIPLET_IDS.map((cid) => {
        const state = cellState[cid];
        const isSelected = selected.includes(cid);
        const selectable = !loading && !!state?.selectable;

        return (
          <button
            key={cid}
            type="button"
            disabled={!selectable && !isSelected}
            onClick={() => selectable && onToggle(cid)}
            className={`default-radius flex flex-col items-center gap-1 border-2 px-2 py-3 text-sm transition-colors ${
              isSelected
                ? "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]"
                : selectable
                  ? "border-gray-100 text-gray-700 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                  : "border-gray-50 text-gray-300 cursor-not-allowed"
            }`}
            title={state ? `${cid} — ${state.primaryLabel}` : `${cid} — not yet available`}
          >
            <span className="font-medium">{cid}</span>
            {loading ? (
              <span className="h-2 w-10 animate-pulse rounded-full bg-gray-100" />
            ) : (
              <span className="flex items-center gap-1 text-center text-[11px] text-gray-500">
                {state && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[state.tone]}`} />}
                {state?.primaryLabel ?? "Not yet generated"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
