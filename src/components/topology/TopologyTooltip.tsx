import type { TooltipState } from "./types";

export default function TopologyTooltip({ tooltip }: { tooltip: TooltipState | null }) {
  if (!tooltip) return null;
  return (
    <div
      className="fixed z-50 max-w-[280px] rounded bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg"
      style={{ left: tooltip.x, top: tooltip.y, pointerEvents: "none" }}
      dangerouslySetInnerHTML={{ __html: tooltip.html }}
    />
  );
}
