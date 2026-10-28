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
// "uncalibrated" (shown as "Not measured") is a dashed gray line, never a
// point on the scale. It is darker (gray-600) and slightly thicker than the
// colored lines so it stands out on a chiplet's gray-100 at a glance.
// `dash` is [dash, gap] in px; the map stretches it to fit each segment.
export const COUPLER_STYLES: Record<CouplerBand, { stroke: string; width: number; dash?: [number, number] }> = {
  good: { stroke: "#22c55e", width: 2.5 },
  warn: { stroke: "#f59e0b", width: 2.5 },
  bad: { stroke: "#ef4444", width: 2.5 },
  uncalibrated: { stroke: "#4b5563", width: 3, dash: [4, 2.5] },
};

/**
 * A dash pattern stretched so a dashed line starts and ends on a dash and
 * covers the full length, the same visible length as a solid line.
 */
export function fittedDash(length: number, [dash, gap]: [number, number]): string {
  const n = Math.max(1, Math.round((length + gap) / (dash + gap)));
  if (n === 1) return `${length} 0`;
  return `${(length - (n - 1) * gap) / n} ${gap}`;
}

export function StateBadge({ state }: { state: MetricState }) {
  return (
    <span
      className={`inline-flex items-center justify-self-end rounded border px-1.5 py-0.5 text-2xs font-medium ${STATE_CLASSES[state].badge}`}
    >
      {stateLabel(state)}
    </span>
  );
}
