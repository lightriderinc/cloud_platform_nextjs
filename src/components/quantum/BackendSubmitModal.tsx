"use client";

import { fetchJson, type Credits } from "@/components/billing/CreditsSummary";
import OutOfCreditsNotice from "@/components/billing/OutOfCreditsNotice";
import JobResultView from "@/components/jobs/JobResultView";
import CircuitSchematic, { type CircuitType } from "@/components/quantum/CircuitSchematic";
import ShotsInput from "@/components/quantum/ShotsInput";
import { QUANTUM_BACKENDS, type QuantumBackendId } from "@/lib/quantum/backends";
import { CIRCUIT_PAYLOADS, submitQuantumJob } from "@/lib/quantum/client";
import type { Job } from "@/types/job";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";

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
  onClose,
}: {
  backend: QuantumBackendId;
  title?: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [circuit, setCircuit] = useState<CircuitType>("h");
  const [shots, setShots] = useState(1000);
  const [submittedJob, setSubmittedJob] = useState<Job | null>(null);

  const needsCredits = QUANTUM_BACKENDS[backend].costPerShotCents > 0;

  const { data: credits } = useQuery({
    queryKey: ["billing", "credits"],
    queryFn: () => fetchJson<Credits>("/api/billing/credits"),
    enabled: needsCredits,
  });
  const outOfCredits = needsCredits && credits !== undefined && credits.remainingCents <= 0;
  const stillCheckingCredits = needsCredits && credits === undefined;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { mutate, isPending, isError, error, reset: resetMutation } = useMutation({
    mutationFn: () => submitQuantumJob(backend, CIRCUIT_PAYLOADS[circuit], shots),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["lr-jobs-list"] });
      setSubmittedJob({ ...job, status: job.status ?? "PENDING", gate: circuit, shots });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
          <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_220px]">
            {/* Left: form or results */}
            <div className="min-w-0">
              {submittedJob ? (
                <JobResultView
                  job={submittedJob}
                  footer={
                    <button
                      type="button"
                      onClick={handleTryAnother}
                      className="default-radius mt-1 w-fit cursor-pointer border border-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      ← Try Another
                    </button>
                  }
                />
              ) : stillCheckingCredits ? null : outOfCredits ? (
                <OutOfCreditsNotice />
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Circuit
                    </label>
                    <select
                      value={circuit}
                      onChange={(e) =>
                        setCircuit(e.target.value as CircuitType)
                      }
                      className="default-radius w-full border border-gray-100 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
                    >
                      {CIRCUITS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label} — {c.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <ShotsInput value={shots} onChange={setShots} />

                  {isError && (
                    <p className="text-sm text-red-500">
                      {error instanceof Error && error.message
                        ? error.message
                        : "Failed to submit job. Please try again."}
                    </p>
                  )}

                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      className="default-radius cursor-pointer border border-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      style={{ backgroundColor: "var(--brand-primary)" }}
                      className="default-radius cursor-pointer px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                    >
                      {isPending ? "Submitting…" : "Submit Job"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Right: circuit schematic (persists across both views) */}
            <div>
              <CircuitSchematic circuit={activeCircuit} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
