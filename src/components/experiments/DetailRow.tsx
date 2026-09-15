import type { ReactNode } from "react";

// Copied verbatim from TopologyDetailPanel's own SummaryRow
// (topology/TopologyDetailPanel.tsx) -- kept as its own small shared file
// here rather than exported from that component, since TopologyDetailPanel
// is otherwise entirely topology-specific (Selection-typed) and shouldn't
// gain an experiments-only export.
export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-gray-100 py-2 text-sm last:border-0">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}
