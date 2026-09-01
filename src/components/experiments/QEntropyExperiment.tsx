"use client";

import { formatCreditsWithUsd } from "@/components/billing/CreditsSummary";
import PresetSelector from "@/components/ui/PresetSelector";
import { entropyCostCents, entropyPricePerBitLabel } from "@/lib/entropy/pricing";
import { useEffect, useMemo, useState } from "react";
import ChipletVisualPicker from "./ChipletVisualPicker";
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

const BIT_COUNT_PRESETS = [16, 32, 64, 128, 256];
// Distinct scale from BIT_COUNT_PRESETS on purpose -- these are shot counts
// for a hardware run, not output bit-lengths, and span the field's actual
// 1,000-1,000,000 range with round, recognizable choices rather than
// reusing pool mode's much smaller preset numbers.
const SAMPLE_COUNT_PRESETS = [10_000, 100_000, 1_000_000];

async function apiJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; body: T }> {
  const res = await fetch(url, init);
  const body = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, body };
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

  const poolByChiplet = useMemo(
    () => Object.fromEntries((pools?.pools ?? []).map((p) => [p.chiplet_id, p])) as Record<string, EntropyPoolEntry>,
    [pools],
  );

  // Pre-confirm estimate only -- bits_per_chiplet x chiplets selected. The
  // actual charge (result.cost_cents) is computed server-side from the bits
  // qpu-proxy confirms were actually withdrawn, which this can't see yet.
  const withdrawTotalBits = bitCount * selectedChiplets.length;
  const withdrawCostCents = useMemo(
    () => entropyCostCents(withdrawTotalBits),
    [withdrawTotalBits],
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
    const { ok, body } = await apiJson<WithdrawResponse & { error?: string; detail?: string; message?: string }>(
      "/api/lr/entropy/withdraw",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chiplet_ids: selectedChiplets, bits_per_chiplet: bitCount, combined }),
      },
    );
    setSubmitting(false);
    if (!ok) {
      // .message carries the human-readable breakdown for billing errors
      // (e.g. insufficient_credits' "costs ~N credits ($X), but your
      // account has...") -- .error alone would just be the bare error code.
      setSubmitError(body.message ?? body.error ?? body.detail ?? "Could not withdraw entropy.");
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

  const selectionHint =
    selectedChiplets.length === 0
      ? `Select one or more chiplets to ${mode === "pool" ? "withdraw entropy from" : "measure live"}.`
      : `${selectedChiplets.length} chiplet${selectedChiplets.length > 1 ? "s" : ""} selected.`;

  return (
    <div className="flex flex-col gap-6">
      {/* Selection (left, primary) + configure/submit (right, sticky so the
          action is never below the fold) -- stacks on narrow viewports. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          {/* Segmented control, not two equal-weight buttons -- pool is the
              common case, live the exception, and a one-line hint replaces
              what used to be a full paragraph per mode. */}
          <div className="mb-4">
            <div className="mb-1.5 inline-flex default-radius border border-gray-200 p-1">
              <button
                type="button"
                onClick={() => switchMode("pool")}
                className={`default-radius cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "pool"
                    ? "bg-[var(--brand-primary)] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                From pool
              </button>
              <button
                type="button"
                onClick={() => switchMode("live")}
                className={`default-radius cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "live"
                    ? "bg-[var(--brand-primary)] text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Live measurement
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {mode === "pool"
                ? "Instant — withdraws pre-generated bits from inventory."
                : "Submits a new hardware run; queues automatically if the device is busy."}
            </p>
          </div>

          <p className="mb-3 text-sm text-gray-600">{selectionHint}</p>

          <ChipletVisualPicker
            selectMode={mode}
            pools={pools}
            candidates={candidates}
            selected={selectedChiplets}
            onToggle={toggleChiplet}
            loading={mode === "pool" ? !pools : !candidates}
          />
        </div>

        <div className="flex w-full flex-col gap-4 default-radius border border-gray-100 bg-gray-50 p-4 lg:sticky lg:top-6 lg:w-[320px] lg:shrink-0">
          <h3 className="text-sm font-semibold text-gray-700">
            {mode === "pool" ? "Configure withdrawal" : "Configure run"}
          </h3>

          {mode === "pool" ? (
            <PresetSelector
              key="pool-bit-count"
              label="Bits per chiplet"
              presets={BIT_COUNT_PRESETS}
              value={bitCount}
              onChange={setBitCount}
              min={1}
              max={1_000_000}
            />
          ) : (
            <PresetSelector
              key="live-samples"
              label="Samples"
              presets={SAMPLE_COUNT_PRESETS}
              value={samples}
              onChange={setSamples}
              min={samplesParam?.min ?? 1_000}
              max={samplesParam?.max ?? 1_000_000}
              formatPreset={(n) => n.toLocaleString()}
            />
          )}

          {mode === "pool" && (
            <label
              className={`flex items-center gap-2 text-sm ${
                selectedChiplets.length < 2 ? "text-gray-300" : "text-gray-700"
              }`}
              title="Combines the selected chiplets' bits into a single XOR'd stream instead of one stream per chiplet."
            >
              <input
                type="checkbox"
                checked={combined}
                disabled={selectedChiplets.length < 2}
                onChange={(e) => setCombined(e.target.checked)}
              />
              Combine into one XOR&apos;d stream
              {selectedChiplets.length < 2 && (
                <span className="text-xs text-gray-300">(select 2+)</span>
              )}
            </label>
          )}

          {mode === "pool" && selectedChiplets.length > 0 && (
            <div className="flex flex-col gap-0.5 text-sm text-gray-600">
              <p>
                {combined
                  ? `Combined: ${withdrawTotalBits.toLocaleString()} bits total`
                  : `${selectedChiplets.length} chiplet${selectedChiplets.length > 1 ? "s" : ""} selected x ${bitCount.toLocaleString()} bits each = ${withdrawTotalBits.toLocaleString()} bits`}
              </p>
              <p>Price: {entropyPricePerBitLabel()} / bit</p>
              <p>Total: {formatCreditsWithUsd(withdrawCostCents)}</p>
            </div>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={mode === "pool" ? handleWithdraw : handleRunLive}
            className="default-radius inline-flex cursor-pointer items-center justify-center border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-primary-light)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting…" : mode === "pool" ? "Withdraw" : "Run measurement"}
          </button>
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          {/* Same panel, right after the button that produced it -- not
              appended after the whole grid. The grid can run much taller
              than this panel, so a result rendered outside/below the row
              sat below the fold of whatever the user had scrolled to,
              even though the button that produced it is right here. Pool
              and live share this exact spot (see the mode-independent
              wrapper div above) so switching modes doesn't move where a
              result appears. */}
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
        </div>
      </div>

      {/* Recent runs is a persistent history list, not the result of the
          click just made -- stays full width below everything, unlike the
          just-submitted result above. Pool mode has no equivalent list. */}
      {mode === "live" && recentRuns.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Recent live runs
          </h4>
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
