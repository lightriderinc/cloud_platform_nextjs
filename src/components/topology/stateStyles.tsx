import type { MetricState } from "@/lib/topology/client";
import { stateLabel } from "@/lib/topology/format";

// Green/amber/red-ish semantics reused from JobStatusBadge's existing
// active/warning/failed convention elsewhere in this app, rather than
// inventing a new palette. Sentinel and absent get a dashed border — they
// are "unknown"/"not exposed", not points on the same quality scale.
export const STATE_CLASSES: Record<MetricState, { badge: string; cell: string }> = {
  active: {
    badge: "bg-green-50 text-green-700 border-green-200",
    cell: "bg-green-500 border-green-500 hover:bg-green-300 transition-colors",
  },
  degraded: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    cell: "bg-amber-400 border-amber-400 hover:bg-amber-300 transition-colors",
  },
  sentinel: {
    badge: "bg-purple-50 text-purple-700 border-purple-300 border-dashed",
    cell: "bg-purple-200 border-dashed border-purple-400 hover:bg-purple-300 transition-colors",
  },
  absent: {
    badge: "bg-gray-50 text-gray-400 border-gray-200 border-dashed",
    cell: "bg-transparent border-dashed border-gray-300 hover:bg-white transition-colors",
  },
};

export function StateBadge({ state }: { state: MetricState }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${STATE_CLASSES[state].badge}`}
    >
      {stateLabel(state)}
    </span>
  );
}
