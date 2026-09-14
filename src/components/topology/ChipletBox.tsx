import type { CSSProperties, MouseEvent, ReactNode } from "react";

// Extracted from ProcessorMapCard's own per-chiplet rendering (chiplet
// header + NxN sub-grid of colored cells) so any view that wants "a
// chiplet box with a qubit-grid silhouette" — colored by whatever metric
// it has, not necessarily per-qubit fRB — can reuse the exact same visual
// grammar instead of inventing a second one. ProcessorMapCard itself now
// renders through this component; its corridor-SVG-anchoring (the
// `id="chip-..."` element) and per-qubit gradient math stay there, passed
// in as plain cell descriptors.

export interface ChipletBoxCell {
  key: string | number;
  className?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent) => void;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseLeave?: () => void;
}

export default function ChipletBox({
  id,
  label,
  countLabel,
  cells,
  gridCols = 3,
  selected,
  disabled,
  boxClassName,
  boxStyle,
  labelClassName,
  countLabelClassName,
  onClick,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
}: {
  id?: string;
  label: ReactNode;
  countLabel?: ReactNode;
  cells: ChipletBoxCell[];
  gridCols?: number;
  /** Outer-box selection ring, for a multi-select caller (ProcessorMapCard doesn't use this — it selects individual qubits, not the whole chiplet). */
  selected?: boolean;
  disabled?: boolean;
  /** Background/border class+style for the whole chiplet box, for a caller that colors the chiplet itself by a chiplet-level metric (e.g. pool depth) rather than per-qubit cells. Ignored while `selected`, so the selection tint stays on top. */
  boxClassName?: string;
  boxStyle?: CSSProperties;
  /** Overrides the default label/countLabel text color -- for a caller whose boxClassName/boxStyle can be dark enough that the default dark-gray text stops being readable. */
  labelClassName?: string;
  countLabelClassName?: string;
  onClick?: () => void;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      id={id}
      className={`relative z-10 default-radius border p-1.5 transition-colors duration-300 ${
        selected
          ? "border-2 border-[var(--brand-primary)] bg-red-50"
          : (boxClassName ?? (disabled ? "border-gray-100 bg-gray-100" : "border-gray-100 bg-gray-100 hover:border-gray-200"))
      } ${disabled ? "cursor-not-allowed" : !selected ? "cursor-pointer" : ""}`}
      style={selected ? undefined : boxStyle}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className={labelClassName ?? "text-sm font-semibold text-gray-700"}>{label}</span>
        {countLabel != null && (
          <span className={countLabelClassName ?? "text-xs text-gray-400"}>{countLabel}</span>
        )}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={`aspect-square default-radius border ${cell.className ?? ""}`}
            style={cell.style}
            onClick={cell.onClick}
            onMouseEnter={cell.onMouseEnter}
            onMouseMove={cell.onMouseMove}
            onMouseLeave={cell.onMouseLeave}
          />
        ))}
      </div>
    </div>
  );
}
