"use client";

import { fetchJobDetail, fetchJobResult } from "@/lib/lr/client";
import type { Job } from "@/types/job";
import { useQuery } from "@tanstack/react-query";
import JobStatusBadge from "@/components/jobs/JobStatusBadge";

const TERMINAL = new Set(["COMPLETED", "FAILED", "ABORTED"]);

interface Props {
  job: Job;
  onTryAnother: () => void;
}

export default function DemoJobResult({ job, onTryAnother }: Props) {
  const { data: detail, isRefetching: isPolling } = useQuery({
    queryKey: ["lr-job-detail", job.uuid],
    queryFn: () => fetchJobDetail(job.uuid),
    retry: 0,
    refetchInterval: (query) =>
      TERMINAL.has(query.state.data?.status ?? job.status) ? false : 3000,
  });

  const currentStatus = detail?.status ?? job.status;

  const { data: counts } = useQuery({
    queryKey: ["lr-job-result", job.uuid],
    queryFn: () => fetchJobResult(job.uuid),
    enabled: currentStatus === "COMPLETED",
  });

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-1 font-mono text-xs text-gray-400">{job.uuid}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-lg font-semibold">
            {job.gate ? `${job.gate.toUpperCase()} Gate` : "Quantum Job"}
          </h3>
          <JobStatusBadge status={currentStatus} />
          {isPolling && (
            <span className="inline-block h-2 w-2 animate-ping rounded-full bg-gray-400 opacity-75" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {job.shots !== undefined && (
          <div>
            <p className="text-xs text-gray-500">Shots</p>
            <p className="mt-0.5 font-medium">{job.shots.toLocaleString()}</p>
          </div>
        )}
        {(detail?.createdAt ?? job.created_at) && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500">Submitted</p>
            <p className="mt-0.5 font-medium">
              {new Date((detail?.createdAt ?? job.created_at)!).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {currentStatus === "COMPLETED" &&
        counts &&
        Object.keys(counts).length > 0 && (
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
                      <span className="w-10 shrink-0 font-mono text-sm text-gray-700">
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
        )}

      {(currentStatus === "PENDING" ||
        currentStatus === "WAITING" ||
        currentStatus === "PROCESSING") && (
        <div className="default-radius border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
          Waiting for results…
        </div>
      )}

      {(currentStatus === "FAILED" || currentStatus === "ABORTED") && (
        <div className="default-radius border border-dashed border-red-200 p-5 text-center text-sm text-red-500">
          Job {currentStatus.toLowerCase()}.
        </div>
      )}

      <button
        type="button"
        onClick={onTryAnother}
        className="default-radius mt-1 w-fit cursor-pointer border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
      >
        ← Try Another
      </button>
    </div>
  );
}
