"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { STATUS_CONFIG } from "@/lib/backends/status/config";
import {
  agePayload,
  applyStaleness,
  toBackendStatusFields,
  type BackendStatusResponse,
  type StatusSource,
} from "@/lib/backends/status/present";
import type { Backend } from "@/types/backend";

// Reads the server-side status light (GET /api/backends/status). The server
// decides; this hook only displays. Each verdict is aged by the time since its
// response arrived, measured on the browser's own clocks (never compared with
// a server timestamp, so a wrong system clock can't skew it), and drops to
// "Checking" if it gets too old, e.g. a tab that kept old data while the
// laptop slept or the network was down.

const POLL_MS = 30_000;
const TICK_MS = 15_000;

interface ReceivedStatus extends BackendStatusResponse {
  receivedWallMs: number;
  receivedMonoMs: number;
}

async function fetchBackendStatus(): Promise<ReceivedStatus> {
  const res = await fetch("/api/backends/status", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  // A 503 still carries `source`, so the cards know to show "Checking"
  // instead of quietly falling back to the legacy light.
  const body = (await res.json().catch(() => null)) as BackendStatusResponse | null;
  if (body?.source !== "server" && body?.source !== "legacy") {
    throw new Error(`Backend status request failed (${res.status})`);
  }
  return { ...body, receivedWallMs: Date.now(), receivedMonoMs: performance.now() };
}

type BackendStatusFields = Pick<Backend, "status" | "statusInfo">;

export interface BackendStatusView {
  /** Which light the cards should show; null until the first response. */
  source: StatusSource | null;
  /** Server verdict for a catalog backend id, ready to spread onto a Backend. */
  statusFor: (backendId: string) => BackendStatusFields;
}

// Re-renders periodically so ages and the staleness watchdog advance between
// polls. The clock is read in the interval callback rather than during render.
function useBrowserClock(intervalMs: number) {
  const [clock, setClock] = useState<{ wall: number; mono: number } | null>(null);
  useEffect(() => {
    const id = setInterval(
      () => setClock({ wall: Date.now(), mono: performance.now() }),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [intervalMs]);
  return clock;
}

export function useBackendStatus(): BackendStatusView {
  const { data } = useQuery({
    queryKey: ["backends", "status"],
    queryFn: fetchBackendStatus,
    refetchInterval: POLL_MS,
    staleTime: POLL_MS,
  });
  const clock = useBrowserClock(TICK_MS);

  return useMemo<BackendStatusView>(() => {
    // Both clocks measure only their own elapsed time; the larger one wins so
    // a monotonic clock paused during sleep can't keep stale data looking fresh.
    const elapsedMs =
      data && clock
        ? Math.max(clock.wall - data.receivedWallMs, clock.mono - data.receivedMonoMs)
        : 0;

    return {
      source: data?.source ?? null,
      statusFor(backendId) {
        const payload = data?.backends?.[backendId];
        if (!payload) {
          return {
            status: "unknown",
            statusInfo: {
              label: "Checking",
              reason: data?.backends
                ? "No status check has run for this machine yet."
                : "Status is temporarily unavailable.",
            },
          };
        }
        return toBackendStatusFields(
          applyStaleness(
            agePayload(payload, elapsedMs),
            STATUS_CONFIG.clientSnapshotStaleMs,
          ),
        );
      },
    };
  }, [data, clock]);
}

/**
 * Applies the server status light to a provider's backends when it's the
 * active source; otherwise returns them unchanged (legacy light).
 */
export function withServerStatus(
  backends: Backend[] | undefined,
  view: BackendStatusView,
): Backend[] | undefined {
  if (view.source !== "server" || !backends) return backends;
  return backends.map((backend) => ({ ...backend, ...view.statusFor(backend.id) }));
}
