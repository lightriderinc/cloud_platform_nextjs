"use client";

import { fetchJobDetail, fetchJobResult } from "@/lib/lr/client";
import type { Job } from "@/types/job";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { MdClose } from "react-icons/md";
import JobStatusBadge from "./JobStatusBadge";

const TERMINAL = new Set(["COMPLETED", "FAILED", "ABORTED"]);

export default function JobResultModal({
  job,
  onClose,
}: {
  job: Job;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { data: detail, isRefetching: isPolling } = useQuery({
    queryKey: ["lr-job-detail", job.uuid],
    queryFn: () => fetchJobDetail(job.uuid),
    retry: 0,
    refetchInterval: (query) =>
      TERMINAL.has(query.state.data?.status ?? job.status) ? false : 2000,
  });

  const currentStatus = detail?.status ?? job.status;

  const { data: counts } = useQuery({
    queryKey: ["lr-job-result", job.uuid],
    queryFn: () => fetchJobResult(job.uuid),
    enabled: currentStatus === "COMPLETED",
  });

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Job details"
    >
      <div
        className="relative w-full max-w-lg default-radius bg-white p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center cursor-pointer rounded-full text-lg text-gray-500 hover:text-gray-700"
        >
          <MdClose />
        </button>

        <div className="mb-6 pr-12">
          <p className="mb-1 font-mono text-xs text-gray-400">{job.uuid}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">
              {job.gate ? `${job.gate.toUpperCase()} gate` : "Quantum Job"}
            </h2>
            <JobStatusBadge status={currentStatus} />
            {isPolling && (
              <span className="inline-block h-2 w-2 animate-ping rounded-full bg-gray-400 opacity-75" />
            )}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          {job.shots !== undefined && (
            <div>
              <p className="text-xs text-gray-500">Shots</p>
              <p className="mt-0.5 font-medium">{job.shots.toLocaleString()}</p>
            </div>
          )}
          {detail?.quantumComputer && (
            <div>
              <p className="text-xs text-gray-500">Backend</p>
              <p className="mt-0.5 font-medium">
                {detail.quantumComputer.displayName}
              </p>
            </div>
          )}
          {job.created_at && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500">Submitted</p>
              <p className="mt-0.5 font-medium">
                {new Date(job.created_at).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {currentStatus === "COMPLETED" &&
          counts &&
          Object.keys(counts).length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Measurement Results
              </h3>
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
          <div className="default-radius border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            Waiting for results…
          </div>
        )}

        {(currentStatus === "FAILED" || currentStatus === "ABORTED") && (
          <div className="default-radius border border-dashed border-red-200 p-6 text-center text-sm text-red-500">
            Job {currentStatus.toLowerCase()}.
          </div>
        )}
      </div>
    </div>
  );
}
