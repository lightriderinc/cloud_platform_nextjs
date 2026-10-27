import type { MetricState } from "@/lib/topology/client";
import { stateLabel } from "@/lib/topology/format";
import type { CouplerBand } from "@/lib/topology/thresholds";

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

// Coupler line styles on the processor map, keyed by thresholds.ts's
// couplerBand(). Same green/amber/red semantics as STATE_CLASSES (Tailwind
// green-500 / amber-500 / red-500 as raw hex, since these are SVG strokes);
// uncalibrated is dashed gray — "unknown", never a point on the scale.
// gray-500, not lighter: it has to stay visible on a chiplet's gray-100.
export const COUPLER_STYLES: Record<CouplerBand, { stroke: string; dash?: string }> = {
  good: { stroke: "#22c55e" },
  warn: { stroke: "#f59e0b" },
  bad: { stroke: "#ef4444" },
  uncalibrated: { stroke: "#6b7280", dash: "3 2" },
};

export function StateBadge({ state }: { state: MetricState }) {
  return (
    <span
      className={`inline-flex items-center justify-self-end rounded border px-1.5 py-0.5 text-2xs font-medium ${STATE_CLASSES[state].badge}`}
    >
      {stateLabel(state)}
    </span>
  );
}
