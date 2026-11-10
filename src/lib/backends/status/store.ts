import { Prisma, type BackendStatusState } from "@prisma/client";
import { db } from "@/lib/billing/db";
import { STATUS_CONFIG } from "./config";
import type {
  EffectiveKind,
  Reading,
  StatusMemory,
  StatusState,
} from "./types";

// Persistence for the status light (server-only). The poller is the only
// writer; GET /api/backends/status only reads.

const STATES: readonly StatusState[] = [
  "online",
  "not_accepting",
  "offline",
  "checking",
  "unreachable",
];

// Upstream bodies kept in the observation log are capped so a misbehaving
// endpoint can't bloat the table.
const RAW_MAX_CHARS = 2_000;

const toMs = (d: Date | null): number | null => (d ? d.getTime() : null);
const toDate = (ms: number | null): Date | null =>
  ms === null ? null : new Date(ms);

function rowToMemory(row: BackendStatusState): StatusMemory {
  return {
    state: STATES.includes(row.state as StatusState)
      ? (row.state as StatusState)
      : "checking",
    reason: row.reason ?? "",
    since: row.since.getTime(),
    lastCheckedAt: row.lastCheckedAt.getTime(),
    lastReadingKind: row.lastReadingKind as EffectiveKind,
    lastHealthyAt: toMs(row.lastHealthyAt),
    consecutiveHealthy: row.consecutiveHealthy,
    consecutiveUnhealthy: row.consecutiveUnhealthy,
    firstUnhealthyAt: toMs(row.firstUnhealthyAt),
    lastUnhealthyAt: toMs(row.lastUnhealthyAt),
    unhealthyReason: row.unhealthyReason,
    unreachableSince: toMs(row.unreachableSince),
    healthStamp: row.healthStamp,
    healthStampChangedAt: toMs(row.healthStampChangedAt),
    acceptingJobs: row.acceptingJobs,
    calibrationOk: row.calibrationOk,
    calibrationCheckedAt: toMs(row.calibrationCheckedAt),
    calibrationSetId: row.calibrationSetId,
    lastExecutionAt: toMs(row.lastExecutionAt),
  };
}

function memoryToData(m: StatusMemory) {
  return {
    state: m.state,
    reason: m.reason,
    since: new Date(m.since),
    lastCheckedAt: new Date(m.lastCheckedAt),
    lastReadingKind: m.lastReadingKind,
    lastHealthyAt: toDate(m.lastHealthyAt),
    consecutiveHealthy: m.consecutiveHealthy,
    consecutiveUnhealthy: m.consecutiveUnhealthy,
    firstUnhealthyAt: toDate(m.firstUnhealthyAt),
    lastUnhealthyAt: toDate(m.lastUnhealthyAt),
    unhealthyReason: m.unhealthyReason,
    unreachableSince: toDate(m.unreachableSince),
    healthStamp: m.healthStamp,
    healthStampChangedAt: toDate(m.healthStampChangedAt),
    acceptingJobs: m.acceptingJobs,
    calibrationOk: m.calibrationOk,
    calibrationCheckedAt: toDate(m.calibrationCheckedAt),
    calibrationSetId: m.calibrationSetId,
    lastExecutionAt: toDate(m.lastExecutionAt),
  };
}

/** Stored status memory per backend id (all backends when `backendIds` is omitted). */
export async function loadStatusMemories(
  backendIds?: string[],
): Promise<Map<string, StatusMemory>> {
  const rows = await db.backendStatusState.findMany(
    backendIds ? { where: { backendId: { in: backendIds } } } : undefined,
  );
  return new Map(rows.map((row) => [row.backendId, rowToMemory(row)]));
}

/**
 * Writes `next` only if nobody else wrote this backend since `prev` was read,
 * using `lastCheckedAt` as the version token. A double-delivered or overlapping
 * cron run therefore can't count the same minute twice. Returns false when
 * this run lost the race (its reading is dropped, which is harmless).
 */
export async function saveStatusMemory(
  backendId: string,
  prev: StatusMemory | null,
  next: StatusMemory,
): Promise<boolean> {
  const data = memoryToData(next);
  if (prev === null) {
    try {
      await db.backendStatusState.create({ data: { backendId, ...data } });
      return true;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return false;
      }
      throw err;
    }
  }
  const { count } = await db.backendStatusState.updateMany({
    where: { backendId, lastCheckedAt: new Date(prev.lastCheckedAt) },
    data,
  });
  return count === 1;
}

function clipRaw(raw: unknown): Prisma.InputJsonValue | undefined {
  if (raw === undefined) return undefined;
  const text = JSON.stringify(raw);
  if (text === undefined) return undefined;
  if (text.length > RAW_MAX_CHARS) {
    return { truncated: true, preview: text.slice(0, RAW_MAX_CHARS) };
  }
  return JSON.parse(text) as Prisma.InputJsonValue;
}

/** Appends one reading (and the verdict it produced) to the observation log. */
export async function recordObservation(
  backendId: string,
  reading: Reading,
  kind: EffectiveKind,
  state: StatusState,
): Promise<void> {
  const raw = clipRaw(reading.raw);
  await db.backendStatusObservation.create({
    data: {
      backendId,
      observedAt: new Date(reading.at),
      kind,
      state,
      httpStatus: reading.httpStatus ?? null,
      latencyMs: reading.latencyMs ?? null,
      detail: reading.detail ?? null,
      ...(raw !== undefined ? { raw } : {}),
    },
  });
}

/** Deletes observations past the retention window; returns how many. */
export async function pruneObservations(now: number): Promise<number> {
  const { count } = await db.backendStatusObservation.deleteMany({
    where: {
      observedAt: { lt: new Date(now - STATUS_CONFIG.observationRetentionMs) },
    },
  });
  return count;
}
