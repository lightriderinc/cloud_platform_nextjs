import type { BackendStatus } from "@/types/backend";

// Visual mapping for each status: a label and a colored dot.
const STATUS_STYLES: Record<
  BackendStatus,
  { label: string; dot: string; text: string }
> = {
  online: { label: "Online", dot: "bg-green-500", text: "text-green-700" },
  paused: { label: "Paused", dot: "bg-yellow-500", text: "text-yellow-700" },
  offline: { label: "Offline", dot: "bg-gray-400", text: "text-gray-500" },
  maintenance: {
    label: "Maintenance",
    dot: "bg-orange-500",
    text: "text-orange-700",
  },
  unknown: { label: "Unknown", dot: "bg-gray-300", text: "text-gray-400" },
};

export default function BackendStatusBadge({
  status,
}: {
  status: BackendStatus;
}) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.text}`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
