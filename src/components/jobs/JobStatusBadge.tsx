import type { JobStatus } from "@/types/job";

const CONFIG: Record<JobStatus, { dot: string; label: string; text: string }> = {
  PENDING: { dot: "bg-gray-400", label: "bg-gray-100 text-gray-600", text: "Pending" },
  WAITING: { dot: "bg-amber-400", label: "bg-amber-50 text-amber-700", text: "Waiting" },
  PROCESSING: { dot: "bg-blue-500", label: "bg-blue-50 text-blue-700", text: "Processing" },
  COMPLETED: { dot: "bg-green-500", label: "bg-green-50 text-green-700", text: "Completed" },
  FAILED: { dot: "bg-red-500", label: "bg-red-50 text-red-700", text: "Failed" },
  ABORTED: { dot: "bg-gray-400", label: "bg-gray-100 text-gray-600", text: "Aborted" },
};

export default function JobStatusBadge({ status }: { status: JobStatus }) {
  const cfg = CONFIG[status] ?? CONFIG.ABORTED;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2.5 py-0.5 text-xs font-medium ${cfg.label}`}>
      {cfg.text}
    </span>
  );
}
