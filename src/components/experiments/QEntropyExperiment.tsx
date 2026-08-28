"use client";

import { useEffect, useMemo, useState } from "react";
import ChipletPicker, { CHIPLET_IDS, type ChipletCellState } from "./ChipletPicker";
import LiveRunCard from "./LiveRunCard";
import { addRecentRun, loadRecentRuns, type RecentRun } from "./recentRuns";
import type {
  CandidatesResponse,
  EntropyPoolEntry,
  EntropyPoolsResponse,
  ExperimentDef,
  ExperimentParam,
  PlacementData,
  WithdrawResponse,
} from "./types";
import WithdrawResultPanel from "./WithdrawResultPanel";

type Mode = "pool" | "live";

async function apiJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; body: T }> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, body };
}

function poolCellState(pools: EntropyPoolsResponse | null): Record<string, ChipletCellState> {
  if (!pools) return {};
  const out: Record<string, ChipletCellState> = {};
  for (const p of pools.pools) {
    out[p.chiplet_id] =
      p.bits_available > 0
        ? { selectable: true, primaryLabel: `${p.bits_available.toLocaleString()} bits`, tone: "positive" }
        : { selectable: false, primaryLabel: "Depleted", tone: "muted" };
  }
  return out;
}

function candidateCellState(candidates: CandidatesResponse | null): Record<string, ChipletCellState> {
  // Every chiplet is selectable in live mode regardless of quality -- a
  // live run can target any chiplet. Candidate scoring is shown as a
  // secondary hint only, so every one of the 12 gets an entry even if the
  // scoring service didn't return one for it.
  const out: Record<string, ChipletCellState> = {};
  for (const cid of CHIPLET_IDS) {
    const entry = candidates?.map[cid];
    if (!entry) {
      out[cid] = { selectable: true, primaryLabel: "Not scored", tone: "neutral" };
      continue;
    }
    const tone = entry.tier === "recommended" || entry.tier === "good" ? "positive" : entry.tier === "unsuitable" ? "muted" : "neutral";
    out[cid] = {
      selectable: true,
      primaryLabel: entry.tier ? entry.tier.charAt(0).toUpperCase() + entry.tier.slice(1) : "Available",
      tone,
    };
  }
  return out;
}

export default function QEntropyExperiment({ experimentDef }: { experimentDef: ExperimentDef }) {
  const samplesParam: ExperimentParam | undefined = experimentDef.params.find((p) => p.name === "samples");

  const [mode, setMode] = useState<Mode>("pool");
  const [selectedChiplets, setSelectedChiplets] = useState<string[]>([]);
  const [combined, setCombined] = useState(false);
  const [bitCount, setBitCount] = useState(10000);
  const [samples, setSamples] = useState<number>(Number(samplesParam?.default ?? 100000));

  const [pools, setPools] = useState<EntropyPoolsResponse | null>(null);
  const [candidates, setCandidates] = useState<CandidatesResponse | null>(null);
  const [calibrationId, setCalibrationId] = useState<string | undefined>(undefined);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResponse | null>(null);
  // The pool snapshot as of the moment a withdrawal was submitted -- kept
  // separate from the live `pools` state (which gets refetched and moves
  // on after a withdrawal) so the result panel's calibration/refill
  // context always reflects what the pool actually looked like for THAT
  // withdrawal, not whatever the picker shows afterward.
  const [resultPoolSnapshot, setResultPoolSnapshot] = useState<Record<string, EntropyPoolEntry>>({});
  const [liveRuns, setLiveRuns] = useState<Array<{ chipletId: string; runId: string }>>([]);

  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [expandedRecent, setExpandedRecent] = useState<Set<string>>(new Set());

  useEffect(() => {
    // localStorage is a browser-only external system -- read on mount,
    // via a microtask so the read/set happens as a deferred callback
    // rather than synchronously during the effect's own render pass.
    Promise.resolve().then(() => setRecentRuns(loadRecentRuns()));
  }, []);

  useEffect(() => {
    if (mode !== "pool") return;
    let cancelled = false;
    apiJson<EntropyPoolsResponse>("/api/lr/entropy/pools").then(({ ok, body }) => {
      if (!cancelled && ok) setPools(body);
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "live") return;
    let cancelled = false;
    apiJson<CandidatesResponse>(`/api/lr/experiments/${experimentDef.id}/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "region", selections: {} }),
    }).then(({ ok, body }) => {
      if (cancelled || !ok) return;
      setCandidates(body);
      if (body.calibration_id) setCalibrationId(body.calibration_id);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, experimentDef.id]);

  const cellState = useMemo(
    () => (mode === "pool" ? poolCellState(pools) : candidateCellState(candidates)),
    [mode, pools, candidates],
  );
  const poolByChiplet = useMemo(
    () => Object.fromEntries((pools?.pools ?? []).map((p) => [p.chiplet_id, p])) as Record<string, EntropyPoolEntry>,
    [pools],
  );

  function switchMode(next: Mode) {
    setMode(next);
    setSelectedChiplets([]);
    setCombined(false);
    setWithdrawResult(null);
    setSubmitError(null);
    setLiveRuns([]);
  }

  function toggleChiplet(cid: string) {
    setSelectedChiplets((s) => (s.includes(cid) ? s.filter((c) => c !== cid) : [...s, cid]));
    setWithdrawResult(null);
    setSubmitError(null);
  }

  async function handleWithdraw() {
    setSubmitting(true);
    setSubmitError(null);
    setWithdrawResult(null);
    const { ok, body } = await apiJson<WithdrawResponse & { error?: string; detail?: string }>(
      "/api/lr/entropy/withdraw",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chiplet_ids: selectedChiplets, bits_per_chiplet: bitCount, combined }),
      },
    );
    setSubmitting(false);
    if (!ok) {
      setSubmitError(body.error ?? body.detail ?? "Could not withdraw entropy.");
      return;
    }
    setResultPoolSnapshot(poolByChiplet);
    setWithdrawResult(body);
    if (!body.insufficient) {
      // Inventory just changed -- refetch so the picker's bits_available
      // reflects the withdrawal, rather than going stale or silently
      // stuck on the pre-withdrawal numbers.
      apiJson<EntropyPoolsResponse>("/api/lr/entropy/pools").then(({ ok: poolsOk, body: fresh }) => {
        if (poolsOk) setPools(fresh);
      });
    }
  }

  async function handleRunLive() {
    setSubmitting(true);
    setSubmitError(null);
    setLiveRuns([]);

    const newRuns: Array<{ chipletId: string; runId: string }> = [];
    for (const cid of selectedChiplets) {
      const placementRes = await apiJson<{ data: PlacementData; calibration_id?: string; error?: string; detail?: string }>(
        `/api/lr/experiments/${experimentDef.id}/placement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selections: { region: cid }, params: { samples }, calibration_id: calibrationId }),
        },
      );
      if (!placementRes.ok) {
        setSubmitError(`${cid}: ${placementRes.body.error ?? placementRes.body.detail ?? "could not resolve placement."}`);
        continue;
      }
      const calId = placementRes.body.calibration_id ?? calibrationId;
      if (calId) setCalibrationId(calId);

      const runRes = await apiJson<{ run_id: string; status: string; error?: string; detail?: string }>(
        `/api/lr/experiments/${experimentDef.id}/runs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selections: { region: cid },
            params: { samples },
            calibration_id: calId,
            placement: placementRes.body.data,
            mode: "live",
          }),
        },
      );
      if (!runRes.ok) {
        setSubmitError(`${cid}: ${runRes.body.error ?? runRes.body.detail ?? "could not submit run."}`);
        continue;
      }
      newRuns.push({ chipletId: cid, runId: runRes.body.run_id });
      const updated = addRecentRun({
        runId: runRes.body.run_id,
        experiment: experimentDef.id,
        chipletId: cid,
        submittedAt: new Date().toISOString(),
      });
      setRecentRuns(updated);
    }

    setSubmitting(false);
    setLiveRuns(newRuns);
  }

  const canSubmit =
    selectedChiplets.length > 0 &&
    !submitting &&
    (mode === "pool" ? bitCount > 0 : samples > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-xs">
        <span className="mb-1 block text-sm font-medium text-gray-700">Mode</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => switchMode("pool")}
            className={`default-radius cursor-pointer border-2 px-3 py-1.5 text-sm transition-colors ${
              mode === "pool"
                ? "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]"
                : "border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            From pool (instant)
          </button>
          <button
            type="button"
            onClick={() => switchMode("live")}
            className={`default-radius cursor-pointer border-2 px-3 py-1.5 text-sm transition-colors ${
              mode === "live"
                ? "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]"
                : "border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            Live measurement (new run)
          </button>
        </div>
        {mode === "pool" ? (
          <p className="mt-2 text-xs text-gray-500">
            Withdraws pre-generated bits from inventory — instant, no job submission.
          </p>
        ) : (
          <p className="mt-2 text-xs text-gray-500">
            Submits a new hardware run. Bits come from a fresh measurement, not inventory — the device may be
            busy, in which case your run queues and completes automatically later.
          </p>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-gray-700">Chiplets</h4>
        <ChipletPicker
          cellState={cellState}
          selected={selectedChiplets}
          onToggle={toggleChiplet}
          loading={mode === "pool" ? !pools : !candidates}
        />
      </div>

      <div className="grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
        {mode === "pool" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Bits per chiplet</span>
            <input
              type="number"
              min={1}
              className="default-radius w-full border border-gray-200 px-3 py-2 text-sm"
              value={bitCount}
              onChange={(e) => setBitCount(Math.max(1, Math.round(Number(e.target.value) || 0)))}
            />
          </label>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Samples
              {samplesParam?.min != null && samplesParam?.max != null && (
                <span className="ml-1 font-normal text-gray-400">
                  ({samplesParam.min.toLocaleString()}–{samplesParam.max.toLocaleString()})
                </span>
              )}
            </span>
            <input
              type="number"
              min={samplesParam?.min}
              max={samplesParam?.max}
              className="default-radius w-full border border-gray-200 px-3 py-2 text-sm"
              value={samples}
              onChange={(e) => setSamples(Math.round(Number(e.target.value) || 0))}
            />
          </label>
        )}

        {mode === "pool" && (
          <label className={`flex items-center gap-2 self-end pb-2 text-sm ${selectedChiplets.length < 2 ? "text-gray-300" : "text-gray-700"}`}>
            <input
              type="checkbox"
              checked={combined}
              disabled={selectedChiplets.length < 2}
              onChange={(e) => setCombined(e.target.checked)}
            />
            Combine into one XOR&apos;d stream
            {selectedChiplets.length < 2 && (
              <span className="text-xs text-gray-300">(select 2+ chiplets)</span>
            )}
          </label>
        )}
      </div>

      <div>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={mode === "pool" ? handleWithdraw : handleRunLive}
          className="default-radius inline-flex cursor-pointer items-center justify-center border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-primary-light)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting…" : mode === "pool" ? "Withdraw" : "Run measurement"}
        </button>
        {submitError && <p className="mt-2 text-sm text-red-600">{submitError}</p>}
      </div>

      {mode === "pool" && withdrawResult && (
        <WithdrawResultPanel
          result={withdrawResult}
          poolByChiplet={resultPoolSnapshot}
          onSelectAlternative={(cid) => {
            setSelectedChiplets([cid]);
            setWithdrawResult(null);
          }}
        />
      )}

      {mode === "live" && liveRuns.length > 0 && (
        <div className="flex flex-col gap-3">
          {liveRuns.map((r) => (
            <LiveRunCard key={r.runId} runId={r.runId} chipletId={r.chipletId} />
          ))}
        </div>
      )}

      {mode === "live" && recentRuns.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-700">Recent live runs</h4>
          <div className="flex flex-col gap-2">
            {recentRuns.slice(0, 5).map((r) => (
              <div key={r.runId} className="default-radius border border-gray-100 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-500">
                    {r.chipletId} · {r.runId} · submitted {new Date(r.submittedAt).toLocaleString()}
                  </span>
                  {!expandedRecent.has(r.runId) && (
                    <button
                      type="button"
                      onClick={() => setExpandedRecent((s) => new Set(s).add(r.runId))}
                      className="default-radius cursor-pointer border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Check status
                    </button>
                  )}
                </div>
                {expandedRecent.has(r.runId) && (
                  <div className="mt-2">
                    <LiveRunCard runId={r.runId} chipletId={r.chipletId} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
