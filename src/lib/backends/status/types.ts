// Provider-agnostic vocabulary for the server-side backend status light.
//
// Flow: a provider probe (e.g. lib/iqm/statusProbe.ts) turns one round of
// upstream calls into a Reading per backend; the pure state machine
// (./stateMachine.ts) folds each Reading into that backend's StatusMemory;
// ./present.ts turns the memory into what the badge shows. The poller
// (./poll.ts) wires them together and persists the memory, so every server
// instance and every visitor sees the same verdict.
//
// Design rule: each displayed state needs specific evidence. When the evidence
// isn't there, the light says "Checking" instead of guessing Online or Offline.

/** What one poll learned about a backend, as classified by its probe. */
export type ReadingKind =
  /** The provider reported the backend healthy. */
  | "healthy"
  /** The provider positively reported the backend unhealthy. */
  | "unhealthy"
  /** The backend is no longer visible to our account. */
  | "not_listed"
  /** No answer: timeout, network error, 408/429 or 5xx. Says nothing about the backend. */
  | "transport_error"
  /** Our credential was refused (401/403). Our problem, never the backend's. */
  | "auth_error"
  /** The provider answered in a shape we don't recognise (its contract changed). */
  | "schema_error";

/**
 * A ReadingKind after the state machine has checked freshness: "stuck" is a
 * healthy reading whose provider-side timestamp stopped advancing, so it can't
 * be trusted as current.
 */
export type EffectiveKind = ReadingKind | "stuck";

export interface Reading {
  kind: ReadingKind;
  /** Provider display name for user-facing reasons, e.g. "IQM". */
  provider: string;
  /** Server epoch ms at which the reading was taken. The only clock used. */
  at: number;
  /**
   * The provider's own freshness stamp (IQM health `updated_at`), if any. Only
   * ever compared with the previous stamp, never with our clock as the primary
   * check, so clock skew can't produce a false verdict.
   */
  healthStamp?: string | null;
  /** Inside an availability window right now; null/undefined = provider didn't say. */
  acceptingJobs?: boolean | null;
  /** Result of a periodic calibration check; undefined = not run this poll. */
  calibration?: { ok: boolean | null; calibrationSetId: string | null };
  /** Most recent customer job seen COMPLETED on this backend (epoch ms). */
  lastExecutionAt?: number | null;
  /** Short log detail, e.g. "HTTP 503" or "timeout". */
  detail?: string;
  httpStatus?: number;
  latencyMs?: number;
  /** Small upstream body worth keeping in the observation log. */
  raw?: unknown;
}

/** What the light shows, decided server-side. */
export type StatusState =
  /** Confirmed healthy recently and running jobs. */
  | "online"
  /** Confirmed healthy, but not running jobs right now (outside window, no calibration). */
  | "not_accepting"
  /** The provider itself reported a problem, repeatedly and recently. */
  | "offline"
  /** Not enough fresh evidence to claim anything. */
  | "checking"
  /** No answer from the provider for a sustained period. */
  | "unreachable";

/** Per-backend memory the state machine carries between polls (persisted). */
export interface StatusMemory {
  state: StatusState;
  /** User-facing, time-free explanation of `state` (ages are added at display time). */
  reason: string;
  /** When `state` was entered (epoch ms). */
  since: number;
  lastCheckedAt: number;
  lastReadingKind: EffectiveKind;
  lastHealthyAt: number | null;
  consecutiveHealthy: number;
  consecutiveUnhealthy: number;
  firstUnhealthyAt: number | null;
  lastUnhealthyAt: number | null;
  unhealthyReason: string | null;
  unreachableSince: number | null;
  healthStamp: string | null;
  healthStampChangedAt: number | null;
  acceptingJobs: boolean | null;
  calibrationOk: boolean | null;
  calibrationCheckedAt: number | null;
  calibrationSetId: string | null;
  lastExecutionAt: number | null;
}
