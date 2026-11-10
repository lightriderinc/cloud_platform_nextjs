import { STATUS_CONFIG } from "./config";
import { latestCompletedJobs } from "./jobEvidence";
import { nextState } from "./stateMachine";
import {
  loadStatusMemories,
  pruneObservations,
  recordObservation,
  saveStatusMemory,
} from "./store";
import type {
  EffectiveKind,
  Reading,
  StatusMemory,
  StatusState,
} from "./types";

// One run of the status poller (server-only), called by
// GET /api/cron/backend-status. Provider-agnostic: a provider plugs in by
// implementing StatusProbe (see lib/iqm/statusProbe.ts).

export interface ProbeResult {
  backendId: string;
  reading: Reading;
}

/** A provider's contribution to the status light. */
export interface StatusProbe {
  provider: string;
  backendIds: string[];
  /**
   * One round of upstream calls, one Reading per backend. `memories` is the
   * stored state, so the probe can schedule periodic extras (e.g. calibration).
   */
  run(memories: ReadonlyMap<string, StatusMemory>): Promise<ProbeResult[]>;
}

export interface PollResult {
  backendId: string;
  kind?: EffectiveKind;
  state?: StatusState;
  /** False when an overlapping run already wrote this backend for this minute. */
  saved: boolean;
  error?: string;
}

export async function runStatusPoll(
  probe: StatusProbe,
): Promise<{ results: PollResult[]; pruned: number }> {
  const memories = await loadStatusMemories(probe.backendIds);
  const startedAt = Date.now();

  const [probeResults, executions] = await Promise.all([
    probe.run(memories),
    latestCompletedJobs(
      probe.backendIds,
      startedAt - STATUS_CONFIG.executionFreshMs,
    ).catch((err: unknown) => {
      // Job evidence is optional; a query failure must not stop the poll.
      console.error("[backend-status] job evidence query failed:", errorText(err));
      return new Map<string, number>();
    }),
  ]);

  const results = await Promise.all(
    probeResults.map(async ({ backendId, reading }): Promise<PollResult> => {
      try {
        const prev = memories.get(backendId) ?? null;
        const executedAt = executions.get(backendId);
        const withEvidence: Reading =
          executedAt === undefined
            ? reading
            : { ...reading, lastExecutionAt: Math.min(executedAt, reading.at) };

        const next = nextState(prev, withEvidence);
        const saved = await saveStatusMemory(backendId, prev, next);
        if (saved) {
          await recordObservation(
            backendId,
            withEvidence,
            next.lastReadingKind,
            next.state,
          );
          logReading(backendId, prev, next, withEvidence);
        }
        return {
          backendId,
          kind: next.lastReadingKind,
          state: next.state,
          saved,
        };
      } catch (err) {
        console.error(`[backend-status] ${backendId}: update failed:`, errorText(err));
        return { backendId, saved: false, error: errorText(err) };
      }
    }),
  );

  const pruned = await pruneObservations(Date.now()).catch((err: unknown) => {
    console.error("[backend-status] prune failed:", errorText(err));
    return 0;
  });

  return { results, pruned };
}

// Transitions are info; readings that mean *our* side is broken (credential
// refused, provider contract changed) are errors worth alerting on, since the
// light can only say "Checking" until someone fixes them.
function logReading(
  backendId: string,
  prev: StatusMemory | null,
  next: StatusMemory,
  reading: Reading,
): void {
  if (!prev || prev.state !== next.state) {
    console.info(
      `[backend-status] ${backendId}: ${prev?.state ?? "(new)"} -> ${next.state} (${next.lastReadingKind})`,
    );
  }
  if (reading.kind === "auth_error" || reading.kind === "schema_error") {
    console.error(
      `[backend-status] ${backendId}: ${reading.kind}${reading.detail ? ` - ${reading.detail}` : ""}`,
    );
  }
}

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
