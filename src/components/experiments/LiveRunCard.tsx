"use client";

import { useEffect, useRef, useState } from "react";
import RunResult from "./RunResult";
import { isTerminalRunStatus, type RunStatusResponse } from "./types";

// A live run can legitimately sit QUEUED for hours waiting for device
// availability (EXPERIMENTS_BUSY_ABANDON_AFTER_SEC defaults to 4 hours
// upstream) -- this is observed, routine behavior, not an edge case. So
// this component polls a FEW times to catch the common case where
// execution starts right away, then stops and shows a persistent "check
// back later" state rather than spinning in the foreground forever.
const BOUNDED_POLL_INTERVAL_MS = 5000;
const BOUNDED_POLL_MAX_ATTEMPTS = 10; // ~50s of quick checks
const ACTIVE_POLL_INTERVAL_MS = 2000; // once EXECUTING/ANALYZING, this IS live and worth polling normally

const STAGE_LABEL: Record<string, string> = {
  compiling: "Compiling circuit",
  compiled: "Compiled",
  executing: "Executing on hardware",
  analyzing: "Analyzing results",
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function fetchStatus(runId: string): Promise<{ ok: boolean; body: RunStatusResponse }> {
  const res = await fetch(`/api/lr/experiments/runs/${runId}`);
  const body = (await res.json().catch(() => ({}))) as RunStatusResponse;
  return { ok: res.ok, body };
}

export default function LiveRunCard({ runId, chipletId }: { runId: string; chipletId: string }) {
  const [status, setStatus] = useState<RunStatusResponse | null>(null);
  const [polling, setPolling] = useState(true);
  const [activePoll, setActivePoll] = useState(false);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  function stopTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function tick() {
    fetchStatus(runId).then(({ ok, body }) => {
      if (cancelledRef.current) return;
      if (!ok) {
        setPolling(false);
        return;
      }
      setStatus(body);

      if (isTerminalRunStatus(body.status)) {
        setPolling(false);
        setActivePoll(false);
        return;
      }

      if (body.status === "EXECUTING" || body.status === "ANALYZING") {
        setActivePoll(true);
        timerRef.current = setTimeout(tick, ACTIVE_POLL_INTERVAL_MS);
        return;
      }

      if (body.stage === "QUEUED_NO_RESERVATION") {
        // Device is busy -- stop the bounded loop immediately rather than
        // burning through the remaining attempts; the "waiting for the
        // device" view takes over below.
        setPolling(false);
        return;
      }

      attemptsRef.current += 1;
      if (attemptsRef.current >= BOUNDED_POLL_MAX_ATTEMPTS) {
        setPolling(false);
        return;
      }
      timerRef.current = setTimeout(tick, BOUNDED_POLL_INTERVAL_MS);
    });
  }

  useEffect(() => {
    // Each run_id gets a fresh LiveRunCard instance (the caller keys on
    // runId), so `polling` is already true from its initial state --
    // nothing to reset here.
    cancelledRef.current = false;
    attemptsRef.current = 0;
    tick();
    return () => {
      cancelledRef.current = true;
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  function checkNow() {
    attemptsRef.current = 0;
    setPolling(true);
    tick();
  }

  if (!status) {
    return <p className="text-sm text-gray-500">Checking status of run {runId}…</p>;
  }

  const terminal = isTerminalRunStatus(status.status);
  const waitingForDevice = !terminal && status.status === "QUEUED" && status.stage === "QUEUED_NO_RESERVATION";
  const latestWarning = status.warnings.length ? status.warnings[status.warnings.length - 1] : null;

  if (terminal && status.status === "SUCCEEDED" && status.result) {
    return <RunResult result={status.result} warnings={status.warnings} chipletId={chipletId} />;
  }

  if (terminal && status.status === "FAILED") {
    const abandonedNoCapacity = status.stage === "ABANDONED_NO_CAPACITY";
    return (
      <div className="default-radius border border-red-100 bg-red-50 p-4 text-sm text-red-800">
        <div className="font-medium">
          {chipletId}: {abandonedNoCapacity ? "Device was unavailable for too long" : "Run failed"}
        </div>
        <div className="mt-1">
          {abandonedNoCapacity
            ? "This run was queued waiting for device availability past the retry ceiling, so it was abandoned. No bits were measured and nothing was charged."
            : (status.error ?? "The run did not complete successfully.")}
        </div>
        {status.stage && <div className="mt-1 font-mono text-xs text-red-600">stage: {status.stage}</div>}
        {abandonedNoCapacity && status.error && <div className="mt-1 text-xs text-red-600">{status.error}</div>}
      </div>
    );
  }

  if (terminal) {
    // A terminal status this UI has no specific rendering for -- shown
    // plainly rather than silently, so it's never mistaken for a hang.
    return (
      <div className="default-radius border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
        <div className="font-medium">
          {chipletId}: status {status.status}
        </div>
        {status.error && <div className="mt-1 text-gray-600">{status.error}</div>}
      </div>
    );
  }

  if (activePoll) {
    return (
      <div className="default-radius border border-gray-100 bg-gray-50 p-4 text-sm">
        <div className="font-medium text-gray-700">
          {chipletId}: {(status.stage && STAGE_LABEL[status.stage]) || "Running"}
        </div>
        {status.progress.shots_requested != null && (
          <div className="mt-2 text-xs text-gray-500">
            {status.progress.shots_completed.toLocaleString()} / {status.progress.shots_requested.toLocaleString()}{" "}
            shots
            {status.progress.batches_total != null && (
              <> · batch {status.progress.batches_done} of {status.progress.batches_total}</>
            )}
          </div>
        )}
      </div>
    );
  }

  if (waitingForDevice) {
    return (
      <div className="default-radius border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="font-medium">{chipletId}: Device is currently busy</div>
        <div className="mt-1 text-blue-800">
          Your request has been queued and will run automatically when the device is available
          {status.next_retry_at && (
            <> (next attempt around <span className="font-medium">{formatTimestamp(status.next_retry_at)}</span>)</>
          )}
          . You can check back later — this page does not need to stay open.
        </div>
        <div className="mt-2 font-mono text-xs text-blue-700">run_id: {runId}</div>
      </div>
    );
  }

  if (polling) {
    return <p className="text-sm text-gray-500">{chipletId}: submitted, checking for early progress…</p>;
  }

  // Bounded polling window elapsed with no busy signal and no execution
  // yet started -- still queued, just not confirmed busy. Same
  // check-back-later framing, with a manual recheck instead of an
  // indefinite foreground timer.
  return (
    <div className="default-radius border border-gray-100 bg-gray-50 p-4 text-sm">
      <div className="font-medium text-gray-700">{chipletId}: Still queued</div>
      <div className="mt-1 text-gray-600">
        {latestWarning?.body ?? "Waiting to start. You can check back later — this page does not need to stay open."}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-xs text-gray-500">run_id: {runId}</span>
        <button
          type="button"
          onClick={checkNow}
          className="default-radius cursor-pointer border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
        >
          Check now
        </button>
      </div>
    </div>
  );
}
