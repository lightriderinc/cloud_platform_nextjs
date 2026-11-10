// Thresholds for the server-side status light. Initial values come from the
// design (claude/cloud-platform/iqm-status-light-redesign.md in the project
// docs); retune them from the shadow-mode observation log, not by guessing.
// Safe to import from client code (no server dependencies).

export interface StatusConfig {
  /** Poll cadence set in vercel.json. Documents the assumption the thresholds below rely on. */
  pollIntervalMs: number;
  /** Consecutive healthy readings before Online (also how recovery from Offline is confirmed). */
  onlineAfterReadings: number;
  /** Online needs a healthy reading at most this old. */
  onlineFreshMs: number;
  /** Consecutive unhealthy readings before Offline... */
  offlineAfterReadings: number;
  /** ...spanning at least this long, so one bad minute never reads as an outage. */
  offlineMinSpanMs: number;
  /** Unhealthy evidence older than this no longer supports showing Offline. */
  offlineFreshMs: number;
  /** No answer at all for this long shows Unreachable. */
  unreachableAfterMs: number;
  /** A health stamp unchanged across readings spanning longer than this means the feed is stuck. */
  stampStuckAfterMs: number;
  /** Backstop: a health stamp older than this by our (NTP-synced) server clock is stuck. */
  stampMaxAgeMs: number;
  /** A customer job that completed this recently proves the backend runs jobs. */
  executionFreshMs: number;
  /** How often the heavier calibration check runs per backend. */
  calibrationIntervalMs: number;
  /** The API reports Checking when the last poll is older than this (poller stopped). */
  snapshotStaleMs: number;
  /** The browser does the same past this age, so a stale tab degrades on its own. */
  clientSnapshotStaleMs: number;
  /** Raw observations older than this are pruned. */
  observationRetentionMs: number;
}

const MINUTE = 60_000;

export const STATUS_CONFIG: StatusConfig = {
  pollIntervalMs: MINUTE,
  onlineAfterReadings: 2,
  onlineFreshMs: 3 * MINUTE,
  offlineAfterReadings: 3,
  offlineMinSpanMs: 2 * MINUTE,
  offlineFreshMs: 10 * MINUTE,
  unreachableAfterMs: 5 * MINUTE,
  stampStuckAfterMs: 90_000,
  stampMaxAgeMs: 10 * MINUTE,
  executionFreshMs: 10 * MINUTE,
  calibrationIntervalMs: 10 * MINUTE,
  snapshotStaleMs: 150_000,
  clientSnapshotStaleMs: 3 * MINUTE,
  observationRetentionMs: 7 * 24 * 60 * MINUTE,
};
