"use client";

import CopyButton from "@/components/ui/CopyButton";
import DownloadButton from "@/components/ui/DownloadButton";
import JobModeTag from "@/components/jobs/JobModeTag";
import JobStatusBadge from "@/components/jobs/JobStatusBadge";
import { formatDuration } from "@/lib/formatDuration";
import { fetchQuantumJobDetail, fetchQuantumJobResult } from "@/lib/quantum/client";
import type { Job } from "@/types/job";
import { useQuery } from "@tanstack/react-query";

const TERMINAL = new Set(["COMPLETED", "FAILED", "ABORTED"]);

interface Props {
  job: Job;
  /** Caller-specific footer action — e.g. "Try Another" (demo) has none here (job list modal just has its own close button). */
  footer?: React.ReactNode;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

/**
 * Polls a job's live status/result and renders it — shared by the dashboard
 * demo's post-submission view and the /jobs page's detail modal, so both
 * present the exact same "Measurement Results" experience instead of two
 * near-duplicate implementations.
 */
export default function JobResultView({ job, footer }: Props) {
  const { data: detail, isRefetching: isPolling } = useQuery({
    queryKey: ["lr-job-detail", job.uuid],
    queryFn: () => fetchQuantumJobDetail(job.uuid),
    retry: 0,
    refetchInterval: (query) =>
      TERMINAL.has(query.state.data?.status ?? job.status) ? false : 3000,
  });

  const currentStatus = detail?.status ?? job.status;

  const createdAt = detail?.createdAt ?? job.created_at;
  const finishedAt = detail?.finishedAt ?? job.finished_at;
  // Runtime always starts from the persisted submission timestamp (the same
  // value the /jobs list uses), not iqm-proxy's own live createdAt — the two
  // record "created" at genuinely different moments (iqm-proxy when it
  // starts processing, us after that same request round-trips back), which
  // otherwise made the list and this modal show two different durations for
  // the same job. finishedAt still prefers the live value so a job's
  // runtime appears as soon as it completes while this modal is open.
  const runtime =
    currentStatus === "COMPLETED" && job.created_at && finishedAt
      ? formatDuration(job.created_at, finishedAt)
      : null;

  const { data: counts, isLoading: isCountsLoading } = useQuery({
    queryKey: ["lr-job-result", job.uuid],
    queryFn: () => fetchQuantumJobResult(job.uuid),
    enabled: currentStatus === "COMPLETED",
  });

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
  const countsJson = counts ? JSON.stringify(counts, null, 2) : "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-xs text-gray-400">{job.uuid}</p>
        {isPolling && (
          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-gray-400 opacity-75" />
        )}
      </div>

      {/* Field grid — status/backend/mode plus every timestamp/count field
          the job actually has. Missing optional values (a job that hasn't
          finished yet, etc.) show "—" rather than skipping the cell, so the
          grid stays stable instead of reflowing per job. */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
        <Field label="Status" value={<JobStatusBadge status={currentStatus} />} />
        <Field label="Backend" value={job.backend ?? "—"} />
        <Field label="Mode" value={<JobModeTag backend={job.backend} />} />
        <Field
          label="Job created"
          value={createdAt ? new Date(createdAt).toLocaleString() : "—"}
        />
        <Field
          label="Job completed"
          value={finishedAt ? new Date(finishedAt).toLocaleString() : "—"}
        />
        <Field label="Runtime" value={runtime ?? "—"} />
        <Field
          label="Number of shots"
          value={job.shots !== undefined ? job.shots.toLocaleString() : "—"}
        />
      </div>

      {currentStatus === "COMPLETED" && isCountsLoading && (
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-700">
            Measurement Results
          </h4>
          <div className="space-y-2.5">
            {[100, 75, 50, 30].map((width, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <span className="h-4 w-10 shrink-0 rounded bg-gray-100" />
                <div className="h-5 flex-1 overflow-hidden rounded bg-gray-100">
                  <div
                    className="h-5 rounded bg-gray-200"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="h-4 w-24 shrink-0 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      )}

      {currentStatus === "COMPLETED" &&
        !isCountsLoading &&
        counts &&
        Object.keys(counts).length > 0 && (
          <div className="space-y-4">
            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-700">
                Measurement Results
              </h4>
              <div className="space-y-2.5">
                {Object.entries(counts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([state, count]) => {
                    const pct = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={state} className="flex items-center gap-3">
                        <span className="min-w-10 shrink-0 whitespace-nowrap font-mono text-sm text-gray-700">
                          |{state}⟩
                        </span>
                        <div className="flex-1 overflow-hidden rounded bg-gray-100">
                          <div
                            className="h-5 rounded bg-blue-500 transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-24 shrink-0 text-right text-xs text-gray-500">
                          {count.toLocaleString()} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Raw counts, exportable — the source data behind the bars above. */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">Raw counts</p>
                <div className="flex items-center gap-2">
                  <CopyButton value={countsJson} label={null} />
                  <DownloadButton
                    value={countsJson}
                    filename={`${job.uuid}-counts.json`}
                    mimeType="application/json"
                    label={null}
                  />
                </div>
              </div>
              <pre className="default-radius overflow-x-auto border border-gray-100 bg-gray-50 p-3 font-mono text-xs text-gray-700">
                {countsJson}
              </pre>
            </div>
          </div>
        )}

      {(currentStatus === "PENDING" ||
        currentStatus === "WAITING" ||
        currentStatus === "PROCESSING") && (
        <div className="default-radius border border-dashed border-gray-100 p-5 text-center text-sm text-gray-500">
          Waiting for results…
        </div>
      )}

      {(currentStatus === "FAILED" || currentStatus === "ABORTED") && (
        <div className="default-radius border border-dashed border-red-200 p-5 text-center text-sm text-red-500">
          Job {currentStatus.toLowerCase()}.
        </div>
      )}

      {footer}
    </div>
  );
}
