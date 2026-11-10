import { describeStatus } from "@/lib/backends/status/present";
import type { BackendStatus, BackendStatusInfo } from "@/types/backend";

// Visual mapping for each status: a label and a colored dot. `unknown` is a
// hollow ring rather than a filled dot, so "can't confirm right now" never
// looks like Offline.
const STATUS_STYLES: Record<
  BackendStatus,
  { label: string; dot: string; text: string }
> = {
  online: { label: "Online", dot: "bg-emerald-500", text: "text-emerald-700" },
  paused: { label: "Paused", dot: "bg-yellow-500", text: "text-yellow-700" },
  offline: { label: "Offline", dot: "bg-gray-400", text: "text-gray-500" },
  maintenance: {
    label: "Maintenance",
    dot: "bg-orange-500",
    text: "text-orange-700",
  },
  unknown: {
    label: "Unknown",
    dot: "border border-gray-400 bg-transparent",
    text: "text-gray-400",
  },
};

// `info` (from the server-side status light) can override the label, e.g.
// "Checking" or "Outside window", and supplies the tooltip: why the status is
// what it is and how fresh that evidence is.
export default function BackendStatusBadge({
  status,
  info,
}: {
  status: BackendStatus;
  info?: BackendStatusInfo;
}) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.text}`}
      title={info ? describeStatus(status, info) : undefined}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden="true" />
      {info?.label ?? style.label}
    </span>
  );
}
