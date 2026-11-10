import type { BackendStatus, BackendStatusInfo } from "@/types/backend";
import { STATUS_CONFIG } from "./config";
import type { StatusMemory, StatusState } from "./types";

// Turns the server-side status memory into what the badge shows, and holds the
// small display helpers shared by the status API and the browser. Safe to
// import from client code (no server dependencies).

/** Which light the IQM cards show (env IQM_STATUS_SOURCE). */
export type StatusSource = "server" | "legacy";

/** Body of GET /api/backends/status. `backends` is absent in legacy mode
 *  (unless `?shadow=1`) and when the status store can't be read. */
export interface BackendStatusResponse {
  source: StatusSource;
  backends?: Record<string, BackendStatusPayload>;
}

/** One backend's status as sent to the browser by GET /api/backends/status. */
export interface BackendStatusPayload {
  status: BackendStatus;
  label: string;
  /** Time-free explanation; ages are added when rendering. */
  reason: string;
  /** Age of the last poll (server clock at response time, so skew-free). */
  checkedAgeMs: number;
  /** Age of the last healthy reading, or null if none has been seen. */
  lastHealthyAgeMs: number | null;
}

// Server states map onto the shared BackendStatus vocabulary so IBM and
// Rigetti cards keep working unchanged; the label carries the finer meaning.
const DISPLAY: Record<StatusState, { status: BackendStatus; label: string }> = {
  online: { status: "online", label: "Online" },
  not_accepting: { status: "paused", label: "Not running jobs" },
  offline: { status: "offline", label: "Offline" },
  checking: { status: "unknown", label: "Checking" },
  unreachable: { status: "unknown", label: "Unreachable" },
};

export function presentStatus(
  m: StatusMemory,
  now: number,
): BackendStatusPayload {
  const display = DISPLAY[m.state];
  const label =
    m.state === "not_accepting" && m.acceptingJobs === false
      ? "Outside window"
      : display.label;
  return applyStaleness(
    {
      status: display.status,
      label,
      reason: m.reason,
      checkedAgeMs: Math.max(0, now - m.lastCheckedAt),
      lastHealthyAgeMs:
        m.lastHealthyAt === null ? null : Math.max(0, now - m.lastHealthyAt),
    },
    STATUS_CONFIG.snapshotStaleMs,
  );
}

/**
 * Watchdog: a verdict whose last poll is older than `maxAgeMs` is no longer
 * evidence of anything, so it becomes Checking. Applied by the API (poller
 * stopped) and again in the browser (tab kept old data while offline/asleep).
 */
export function applyStaleness(
  payload: BackendStatusPayload,
  maxAgeMs: number,
): BackendStatusPayload {
  if (payload.checkedAgeMs <= maxAgeMs) return payload;
  return {
    ...payload,
    status: "unknown",
    label: "Checking",
    reason: "Status checks are delayed.",
  };
}

/** Advances a payload's ages by the time elapsed since the browser received it. */
export function agePayload(
  payload: BackendStatusPayload,
  elapsedMs: number,
): BackendStatusPayload {
  const elapsed = Math.max(0, elapsedMs);
  return {
    ...payload,
    checkedAgeMs: payload.checkedAgeMs + elapsed,
    lastHealthyAgeMs:
      payload.lastHealthyAgeMs === null
        ? null
        : payload.lastHealthyAgeMs + elapsed,
  };
}

/** The Backend fields the badge renders, from a payload. */
export function toBackendStatusFields(payload: BackendStatusPayload): {
  status: BackendStatus;
  statusInfo: BackendStatusInfo;
} {
  return {
    status: payload.status,
    statusInfo: {
      label: payload.label,
      reason: payload.reason,
      checkedAgeMs: payload.checkedAgeMs,
      lastHealthyAgeMs: payload.lastHealthyAgeMs,
    },
  };
}

/** Compact age for tooltips: "45s", "4 min", "2 h", "3 d". */
export function formatAge(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

/** Badge tooltip: the reason plus how fresh the evidence is. */
export function describeStatus(
  status: BackendStatus,
  info: BackendStatusInfo,
): string {
  const parts: string[] = [];
  if (info.reason) parts.push(info.reason);
  if (info.checkedAgeMs !== undefined) {
    parts.push(`Checked ${formatAge(info.checkedAgeMs)} ago.`);
  }
  if (status !== "online" && info.lastHealthyAgeMs != null) {
    parts.push(`Last healthy reading ${formatAge(info.lastHealthyAgeMs)} ago.`);
  }
  return parts.join(" ");
}
