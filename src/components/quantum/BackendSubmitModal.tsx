"use client";

import CreditsSummary, { fetchJson, type Credits } from "@/components/billing/CreditsSummary";
import JobResultView from "@/components/jobs/JobResultView";
import CircuitSchematic, {
  type CircuitType,
} from "@/components/quantum/CircuitSchematic";
import ShotsInput from "@/components/quantum/ShotsInput";
import LRButton from "@/components/ui/LRButton";
import WarningBox from "@/components/WarningBox";
import {
  isPaidBackend,
  isPricedPerJob,
  type QuantumBackendId,
} from "@/lib/quantum/backends";
import {
  CIRCUIT_PAYLOADS,
  fetchJobPrice,
  fetchQuantumJobDetail,
  PriceChangedError,
  PriceConfirmationRequiredError,
  submitQuantumJob,
  type JobPriceQuote,
} from "@/lib/quantum/client";
import Link from "next/link";
import type { Job } from "@/types/job";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MdArrowLeft, MdClose } from "react-icons/md";

const CIRCUITS: { value: CircuitType; label: string; description: string }[] = [
  { value: "h", label: "H gate", description: "1-qubit superposition" },
  { value: "bell", label: "Bell state", description: "2-qubit entangled pair" },
];

function toCircuitType(gate: string | undefined): CircuitType | null {
  if (gate === "h" || gate === "bell") return gate;
  return null;
}

/**
 * Shared circuit-submission modal — the form/schematic/result logic
 * DemoCircuitModal originally built, generalized to take any backend instead
 * of a hardcoded one. Used by:
 *   - the Dashboard's "Submit sample circuits" tile (backend="iqm-garnet-mock")
 *   - the /backends catalog's "Submit a job" button on each of the 6 IQM cards
 *   - (via NewJobModal) the Jobs page's real-hardware submission form
 *
 * The credit gate only applies when the backend actually costs something —
 * mock backends (costPerShotCents: 0) skip the /api/billing/credits fetch
 * entirely rather than gating on a balance that's never checked server-side.
 */
export default function BackendSubmitModal({
  backend,
  title = "Submit Sample Circuit",
  initialCircuit = "h",
  successMessage,
  onClose,
}: {
  backend: QuantumBackendId;
  title?: string;
  initialCircuit?: CircuitType;
  /** Extra content shown above the result once the job has been submitted — e.g. course-specific next steps. */
  successMessage?: React.ReactNode;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [circuit, setCircuit] = useState<CircuitType>(initialCircuit);
  const [shots, setShots] = useState(1000);
  const [submittedJob, setSubmittedJob] = useState<Job | null>(null);

  const needsCredits = isPaidBackend(backend);
  // IonQ Forte: priced per job. The user gets a quote, sees it against their
  // balance, and confirms; the submit then carries the confirmed price.
  // The same price panel also appears when the server asks for a price on a
  // backend that is normally free (the IonQ noisy simulator once
  // IONQ_NOISY_SIM_PRICE_PER_SHOT_USD is set): a quote is then set from the
  // server's answer, and the next submit confirms it.
  const pricedPerJob = isPricedPerJob(backend);
  const [quote, setQuote] = useState<JobPriceQuote | null>(null);
  const [priceNotice, setPriceNotice] = useState<string | null>(null);

  const { data: credits } = useQuery({
    queryKey: ["billing", "credits"],
    queryFn: () => fetchJson<Credits>("/api/billing/credits"),
    enabled: needsCredits,
  });
  // Real QPU access requires an unlocked account — a purchase or credits
  // received from another user. The free signup grant alone doesn't unlock
  // it, even if remainingCents > 0. Mirrors hasUnlockedCredits() server-side.
  const blockedByCredits =
    needsCredits &&
    credits !== undefined &&
    (!credits.hasUnlocked || credits.remainingCents <= 0);
  const stillCheckingCredits = needsCredits && credits === undefined;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const {
    mutate,
    isPending,
    isError,
    error,
    reset: resetMutation,
  } = useMutation({
    mutationFn: async () => {
      const submitTime = new Date().toISOString();
      const job = await submitQuantumJob(
        backend,
        CIRCUIT_PAYLOADS[circuit],
        shots,
        quote?.priceCredits,
      );
      return { job, submitTime };
    },
    onError: (err) => {
      // The server re-quoted higher than what was confirmed: show the new
      // price and ask again. Nothing was charged or sent.
      if (err instanceof PriceChangedError && quote) {
        setQuote({ ...quote, priceCredits: err.priceCredits });
        setPriceNotice(err.message);
        resetMutation();
      }
      if (err instanceof PriceConfirmationRequiredError) {
        setQuote({
          priceCredits: err.priceCredits,
          balanceCredits: err.balanceCredits ?? credits?.remainingCents ?? 0,
        });
        setPriceNotice("This job has a price. Review it and confirm to submit.");
        resetMutation();
      }
    },
    onSuccess: ({ job, submitTime }) => {
      queryClient.invalidateQueries({ queryKey: ["lr-jobs-list"] });
      setSubmittedJob({
        ...job,
        status: job.status ?? "PENDING",
        created_at: submitTime,
        gate: circuit,
        backend,
        shots,
      });
    },
  });

  // JobResultView polls this same query key internally once it mounts below
  // (refetchInterval, every 3s until terminal) — this subscribes to that
  // same shared cache entry rather than polling separately. submitQuantumJob()'s
  // response never carries finished_at (it can't — the job hasn't finished
  // yet at submit time), so without folding this in, job.finished_at stays
  // permanently unset for a freshly-submitted job and Runtime never has an
  // end timestamp to compute from. Derived at render time (not written back
  // into submittedJob via an effect) so this can't trigger a setState-during-
  // effect render cascade.
  const { data: submittedJobDetail } = useQuery({
    queryKey: ["lr-job-detail", submittedJob?.uuid],
    queryFn: () => fetchQuantumJobDetail(submittedJob!.uuid),
    enabled: !!submittedJob,
    retry: 0,
  });

  // created_at swaps to the persisted DB value (the same one /jobs' list and
  // detail views use) as soon as it's available — no need to wait for
  // terminal state, since our DB row exists well before the job finishes.
  // finished_at still only backfills once genuinely terminal.
  const displayedJob = submittedJob
    ? {
        ...submittedJob,
        created_at: submittedJobDetail?.persistedCreatedAt ?? submittedJob.created_at,
        finished_at:
          submittedJob.finished_at ??
          (submittedJobDetail?.isInTerminalState ? submittedJobDetail.finishedAt : undefined),
      }
    : submittedJob;

  const {
    mutate: requestQuote,
    isPending: isQuoting,
    error: quoteError,
    reset: resetQuote,
  } = useMutation({
    mutationFn: () => fetchJobPrice(backend, CIRCUIT_PAYLOADS[circuit], shots),
    onSuccess: (q) => {
      setQuote(q);
      setPriceNotice(null);
    },
  });

  // A quote is for one exact circuit and shot count; changing either clears it.
  function clearQuote() {
    setQuote(null);
    setPriceNotice(null);
    resetQuote();
  }

  const balanceCredits = credits?.remainingCents ?? quote?.balanceCredits ?? null;
  const priceAboveBalance = !!quote && balanceCredits !== null && quote.priceCredits > balanceCredits;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pricedPerJob && !quote) {
      requestQuote();
      return;
    }
    if (quote && priceAboveBalance) return;
    mutate();
  }

  function handleTryAnother() {
    setSubmittedJob(null);
    resetMutation();
  }

  const activeCircuit: CircuitType =
    (submittedJob && toCircuitType(submittedJob.gate)) ?? circuit;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col default-radius bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-8 pb-5 pt-8 pr-16">
          <h2 className="text-lg font-semibold">
            {submittedJob ? "Job Result" : title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg text-gray-500 hover:text-gray-700"
          >
            <MdClose />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-8 pb-8">
          <div
            className={
              blockedByCredits
                ? "grid grid-cols-1"
                : "grid grid-cols-1 gap-8 md:grid-cols-[1fr_220px]"
            }
          >
            {/* Left: form or results */}
            <div className="min-w-0">
              {displayedJob ? (
                <div className="flex flex-col gap-5">
                  {successMessage}
                  <JobResultView
                    job={displayedJob}
                    footer={
                      <LRButton
                        variant="secondary-outline"
                        icon={<MdArrowLeft className="text-lg" />}
                        iconPosition="left"
                        onClick={handleTryAnother}
                        className="mt-1 w-fit"
                      >
                        Try Another
                      </LRButton>
                    }
                  />
                </div>
              ) : stillCheckingCredits ? null : blockedByCredits ? (
                <CreditsSummary />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Circuit
                    </label>
                    <select
                      value={circuit}
                      onChange={(e) => {
                        setCircuit(e.target.value as CircuitType);
                        clearQuote();
                      }}
                      className="default-radius w-full border border-gray-100 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                      {CIRCUITS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label} — {c.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <ShotsInput
                    value={shots}
                    onChange={(n) => {
                      setShots(n);
                      clearQuote();
                    }}
                  />

                  {pricedPerJob && quoteError && (
                    <p className="text-sm text-red-500">
                      {quoteError instanceof Error && quoteError.message
                        ? quoteError.message
                        : "Couldn't get a price for this job. Please try again."}
                    </p>
                  )}

                  {quote && (
                    <div className="default-radius border border-gray-100 bg-gray-50 p-4 text-sm" data-job-price>
                      {priceNotice && <p className="mb-2 text-amber-700">{priceNotice}</p>}
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-600">Price for this job</span>
                        <span className="font-semibold text-gray-900">{quote.priceCredits.toLocaleString()} credits</span>
                      </div>
                      {pricedPerJob && quote.minimumCredits != null && quote.minimumCredits > 0 && (
                        <p className="mt-1 text-right text-xs text-gray-500" data-forte-minimum>
                          Minimum {quote.minimumCredits.toLocaleString()} credits per job
                        </p>
                      )}
                      {balanceCredits !== null && (
                        <div className="mt-1 flex justify-between gap-4">
                          <span className="text-gray-600">Your balance</span>
                          <span className="text-gray-900">{balanceCredits.toLocaleString()} credits</span>
                        </div>
                      )}
                      {priceAboveBalance ? (
                        <p className="mt-3 text-red-600" data-price-blocked>
                          You need {quote.priceCredits.toLocaleString()} credits for this job but have{" "}
                          {balanceCredits!.toLocaleString()}.{" "}
                          <Link href="/settings/manage-credits/purchase" className="brand-link">
                            Buy credits
                          </Link>{" "}
                          to submit it.
                        </p>
                      ) : (
                        <p className="mt-3 text-gray-500">
                          The price is charged when you submit. It is not adjusted after the job runs.
                        </p>
                      )}
                    </div>
                  )}

                  {isError && (
                    <p className="text-sm text-red-500">
                      {error instanceof Error && error.message
                        ? error.message
                        : "Failed to submit job. Please try again."}
                    </p>
                  )}

                  {needsCredits && (
                    <WarningBox>
                      Submitting circuits to QPUs will cost you credits
                    </WarningBox>
                  )}

                  <div className="flex justify-end gap-3 pt-1">
                    <LRButton variant="secondary-outline" onClick={onClose}>
                      Cancel
                    </LRButton>
                    <LRButton
                      variant="primary"
                      type="submit"
                      disabled={isPending || isQuoting || (!!quote && priceAboveBalance)}
                    >
                      {pricedPerJob && !quote
                        ? isQuoting
                          ? "Getting price…"
                          : "Get price"
                        : isPending
                          ? "Submitting…"
                          : quote
                            ? `Confirm and submit (${quote.priceCredits.toLocaleString()} credits)`
                            : "Submit Job"}
                    </LRButton>
                  </div>
                </form>
              )}
            </div>

            {/* Right: circuit schematic (persists across both views, hidden when blocked by credits) */}
            {!blockedByCredits && (
              <div>
                <CircuitSchematic circuit={activeCircuit} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
