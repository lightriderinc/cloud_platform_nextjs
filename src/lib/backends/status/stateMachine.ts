import { STATUS_CONFIG, type StatusConfig } from "./config";
import type {
  EffectiveKind,
  Reading,
  StatusMemory,
  StatusState,
} from "./types";

// The status light's decision logic. Pure: the result depends only on the
// arguments, and time comes only from `reading.at` (the server clock). That
// makes every rule unit-testable and every verdict replayable from the
// BackendStatusObservation log.
//
// Invariants:
//   - Never Online unless the latest conclusive reading is healthy, confirmed
//     on consecutive readings, and recent (or a customer job just completed).
//   - Never Offline unless the provider itself reported a problem on several
//     consecutive readings, spanning minutes, and recently.
//   - Everything in between is Checking (or Unreachable when nothing answers).

/** Folds one reading into a backend's memory and decides what the light shows. */
export function nextState(
  prev: StatusMemory | null,
  reading: Reading,
  cfg: StatusConfig = STATUS_CONFIG,
): StatusMemory {
  const now = reading.at;
  const stamp = trackHealthStamp(prev, reading, cfg);
  const kind: EffectiveKind = stamp.stuck ? "stuck" : reading.kind;

  const m: StatusMemory = {
    ...(prev ?? emptyMemory(now)),
    lastCheckedAt: now,
    lastReadingKind: kind,
    healthStamp: stamp.value,
    healthStampChangedAt: stamp.changedAt,
  };

  applyReadingToCounters(m, kind, reading.provider, now);

  // Availability is re-read every poll; no answer means no claim.
  m.acceptingJobs = reading.acceptingJobs ?? null;

  if (reading.calibration) {
    m.calibrationOk = reading.calibration.ok;
    m.calibrationCheckedAt = now;
    if (reading.calibration.calibrationSetId) {
      m.calibrationSetId = reading.calibration.calibrationSetId;
    }
  }

  if (reading.lastExecutionAt != null) {
    m.lastExecutionAt = Math.max(m.lastExecutionAt ?? 0, reading.lastExecutionAt);
  }

  const { state, reason } = decide(m, kind, reading.provider, now, cfg);
  m.since = prev && prev.state === state ? prev.since : now;
  m.state = state;
  m.reason = reason;
  return m;
}

function emptyMemory(now: number): StatusMemory {
  return {
    state: "checking",
    reason: "",
    since: now,
    lastCheckedAt: now,
    lastReadingKind: "transport_error",
    lastHealthyAt: null,
    consecutiveHealthy: 0,
    consecutiveUnhealthy: 0,
    firstUnhealthyAt: null,
    lastUnhealthyAt: null,
    unhealthyReason: null,
    unreachableSince: null,
    healthStamp: null,
    healthStampChangedAt: null,
    acceptingJobs: null,
    calibrationOk: null,
    calibrationCheckedAt: null,
    calibrationSetId: null,
    lastExecutionAt: null,
  };
}

// Tracks the provider's own freshness stamp. A healthy reading whose stamp
// hasn't moved across readings spanning `stampStuckAfterMs` is "stuck": the
// provider is replaying old data. The comparison is stamp-to-stamp (provider
// clock vs provider clock), so neither our clock nor a visitor's can skew it.
// The server-clock age check is only a coarse backstop.
function trackHealthStamp(
  prev: StatusMemory | null,
  reading: Reading,
  cfg: StatusConfig,
): { value: string | null; changedAt: number | null; stuck: boolean } {
  if (!reading.healthStamp) {
    return {
      value: prev?.healthStamp ?? null,
      changedAt: prev?.healthStampChangedAt ?? null,
      stuck: false,
    };
  }

  const changed = reading.healthStamp !== prev?.healthStamp;
  const changedAt =
    changed || prev?.healthStampChangedAt == null
      ? reading.at
      : prev.healthStampChangedAt;

  if (reading.kind !== "healthy") {
    return { value: reading.healthStamp, changedAt, stuck: false };
  }

  const frozen = reading.at - changedAt > cfg.stampStuckAfterMs;
  const stampMs = Date.parse(reading.healthStamp);
  const tooOld =
    Number.isFinite(stampMs) && reading.at - stampMs > cfg.stampMaxAgeMs;
  return { value: reading.healthStamp, changedAt, stuck: frozen || tooOld };
}

function applyReadingToCounters(
  m: StatusMemory,
  kind: EffectiveKind,
  provider: string,
  now: number,
): void {
  switch (kind) {
    case "healthy":
      m.consecutiveHealthy += 1;
      m.consecutiveUnhealthy = 0;
      m.firstUnhealthyAt = null;
      m.unhealthyReason = null;
      m.lastHealthyAt = now;
      m.unreachableSince = null;
      return;
    case "unhealthy":
    case "not_listed":
      m.consecutiveUnhealthy += 1;
      m.consecutiveHealthy = 0;
      m.firstUnhealthyAt ??= now;
      m.lastUnhealthyAt = now;
      m.unhealthyReason =
        kind === "not_listed"
          ? `No longer available to Light Rider's ${provider} account.`
          : `${provider} reports this machine as unhealthy.`;
      m.unreachableSince = null;
      return;
    case "stuck":
      // The provider answered, but with data that stopped updating: breaks a
      // healthy streak, proves nothing negative.
      m.consecutiveHealthy = 0;
      m.unreachableSince = null;
      return;
    case "transport_error":
      m.unreachableSince ??= now;
      return;
    case "auth_error":
    case "schema_error":
      // The provider answered, so it isn't unreachable; but the answer says
      // nothing about the machine. Streaks are left untouched.
      m.unreachableSince = null;
      return;
  }
}

function decide(
  m: StatusMemory,
  kind: EffectiveKind,
  provider: string,
  now: number,
  cfg: StatusConfig,
): { state: StatusState; reason: string } {
  // 1. Offline: sustained, recent, positive evidence from the provider itself.
  if (
    m.consecutiveUnhealthy >= cfg.offlineAfterReadings &&
    m.firstUnhealthyAt !== null &&
    now - m.firstUnhealthyAt >= cfg.offlineMinSpanMs &&
    m.lastUnhealthyAt !== null &&
    now - m.lastUnhealthyAt <= cfg.offlineFreshMs
  ) {
    return {
      state: "offline",
      reason: m.unhealthyReason ?? `${provider} reports this machine as unhealthy.`,
    };
  }

  // 2. Online: the latest conclusive reading is healthy, confirmed, recent.
  //    Or, while health is inconclusive (never negative), a customer job just
  //    completed here, which is direct proof the machine runs jobs.
  const confirmedHealthy =
    m.consecutiveHealthy >= cfg.onlineAfterReadings &&
    m.lastHealthyAt !== null &&
    now - m.lastHealthyAt <= cfg.onlineFreshMs;
  const executedRecently =
    m.consecutiveUnhealthy === 0 &&
    m.lastExecutionAt !== null &&
    now - m.lastExecutionAt <= cfg.executionFreshMs;

  if (confirmedHealthy || executedRecently) {
    if (m.acceptingJobs === false) {
      return {
        state: "not_accepting",
        reason: `Healthy, but outside ${provider}'s on-demand window. Jobs wait for the next window.`,
      };
    }
    if (m.calibrationOk === false) {
      return {
        state: "not_accepting",
        reason: "Healthy, but no calibrated gates are available right now.",
      };
    }
    return {
      state: "online",
      reason: confirmedHealthy
        ? `${provider} reports this machine as healthy.`
        : "A job completed on this machine in the last few minutes.",
    };
  }

  // 3. Unreachable: no answer at all for a sustained period. True whoever is
  //    at fault, which is why it's a separate state from Offline.
  if (
    m.unreachableSince !== null &&
    now - m.unreachableSince >= cfg.unreachableAfterMs
  ) {
    return {
      state: "unreachable",
      reason: `${provider} hasn't answered Light Rider's status checks.`,
    };
  }

  // 4. Not enough fresh evidence to claim anything.
  return { state: "checking", reason: checkingReason(m, kind, provider) };
}

function checkingReason(
  m: StatusMemory,
  kind: EffectiveKind,
  provider: string,
): string {
  switch (kind) {
    case "healthy":
      return `Confirming ${provider}'s healthy reading.`;
    case "unhealthy":
    case "not_listed":
      return `${provider} reported a problem. Confirming before showing Offline.`;
    case "stuck":
      return `${provider}'s health data has stopped updating.`;
    case "transport_error":
      return m.lastHealthyAt !== null
        ? `${provider} didn't answer the latest status checks.`
        : `Waiting for ${provider} to answer a status check.`;
    case "auth_error":
    case "schema_error":
      return `Light Rider can't verify this machine's status with ${provider} right now.`;
  }
}
