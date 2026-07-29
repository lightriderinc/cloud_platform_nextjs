"use client";

import JobDetailModal from "@/components/jobs/JobDetailModal";
import JobRowSkeleton from "@/components/jobs/JobRowSkeleton";
import JobStatusBadge from "@/components/jobs/JobStatusBadge";
import { fetchQuantumJobDetail } from "@/lib/quantum/client";
import type { JobStatus } from "@/types/job";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const TERMINAL = new Set(["COMPLETED", "FAILED", "ABORTED"]);

export interface JobRow {
  jobId: string;
  backend: string;
  shots: number;
  status: JobStatus;
  createdAt: string;
}

export async function fetchJobs(): Promise<JobRow[]> {
  const res = await fetch("/api/lr/quantum/jobs");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.jobs ?? [];
}

/**
 * Cached status shows instantly; anything not yet terminal keeps polling
 * live, same interval/logic as JobResultView, so a list of many jobs
 * doesn't force N live iqm-proxy calls on every page load — only the ones
 * still in flight.
 */
export function JobRowStatus({
  jobId,
  cachedStatus,
}: {
  jobId: string;
  cachedStatus: JobStatus;
}) {
  const { data: detail } = useQuery({
    queryKey: ["lr-job-detail", jobId],
    queryFn: () => fetchQuantumJobDetail(jobId),
    retry: 0,
    enabled: !TERMINAL.has(cachedStatus),
    refetchInterval: (query) =>
      TERMINAL.has(query.state.data?.status ?? cachedStatus) ? false : 3000,
  });

  return <JobStatusBadge status={detail?.status ?? cachedStatus} />;
}

export default function JobsList() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const {
    data: jobs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["lr-jobs-list"],
    queryFn: fetchJobs,
  });

  if (isLoading) {
    return (
      <ul className="mt-5 flex flex-col gap-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i}>
            <JobRowSkeleton />
          </li>
        ))}
      </ul>
    );
  }

  if (error) {
    return (
      <p className="mt-5 text-sm text-red-500">
        {error instanceof Error ? error.message : "Failed to load jobs."}
      </p>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="default-radius border border-dashed border-gray-200 bg-gray-50 p-16 text-center mt-5 text-sm text-gray-500">
        Jobs you submit will appear here. You can track their status and view
        results once they complete.
      </div>
    );
  }

  const selectedJob = jobs.find((j) => j.jobId === selectedJobId);

  return (
    <>
      <p className="mb-6 text-md text-gray-950">
        {jobs.length} {jobs.length === 1 ? "Job" : "Jobs"} Submitted
      </p>
      <ul className="mt-5 flex flex-col gap-2">
        {jobs.map((job) => (
          <li key={job.jobId}>
            <button
              type="button"
              onClick={() => setSelectedJobId(job.jobId)}
              className="flex w-full items-end justify-between gap-4 default-radius border border-gray-100 bg-gray-100 p-3 text-left transition-colors card-hover-primary cursor-pointer"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-gray-400">
                  {job.jobId}
                </p>
                <p className="mt-1 font-medium text-sm text-gray-600">
                  {job.backend} · {job.shots.toLocaleString()} shots
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <JobRowStatus jobId={job.jobId} cachedStatus={job.status} />
                <span className="text-xs text-gray-500 font-medium">
                  {new Date(job.createdAt).toLocaleString()}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {selectedJob && (
        <JobDetailModal
          job={{
            uuid: selectedJob.jobId,
            status: selectedJob.status,
            backend: selectedJob.backend,
            shots: selectedJob.shots,
            created_at: selectedJob.createdAt,
          }}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </>
  );
}
