"use client";

import JobDetailModal from "@/components/jobs/JobDetailModal";
import JobModeTag from "@/components/jobs/JobModeTag";
import JobRowSkeleton from "@/components/jobs/JobRowSkeleton";
import JobStatusBadge from "@/components/jobs/JobStatusBadge";
import { formatDuration } from "@/lib/formatDuration";
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
  finishedAt: string | null;
}

export async function fetchJobs(): Promise<JobRow[]> {
  const res = await fetch("/api/lr/quantum/jobs");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.jobs ?? [];
}

/** First 8 chars of the job UUID — full id is still in the DOM via `title`. */
function shortId(jobId: string): string {
  return `${jobId.slice(0, 8)}…`;
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

const HEADERS = ["Job ID", "Created", "Completed", "Runtime", "Backend", "Status", "Mode"];

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

  if (error) {
    return (
      <p className="mt-5 text-sm text-red-500">
        {error instanceof Error ? error.message : "Failed to load jobs."}
      </p>
    );
  }

  if (!isLoading && (!jobs || jobs.length === 0)) {
    return (
      <div className="default-radius border border-dashed border-gray-200 bg-gray-50 p-16 text-center mt-5 text-sm text-gray-500">
        Jobs you submit will appear here. You can track their status and view
        results once they complete.
      </div>
    );
  }

  const selectedJob = jobs?.find((j) => j.jobId === selectedJobId);

  return (
    <>
      {!isLoading && jobs && (
        <p className="mb-6 text-md text-gray-950">
          {jobs.length} {jobs.length === 1 ? "Job" : "Jobs"} Submitted
        </p>
      )}

      <div className="mt-5 overflow-x-auto default-radius border border-gray-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              {HEADERS.map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-2 font-medium text-gray-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={isLoading ? "animate-pulse" : undefined}>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <JobRowSkeleton key={i} />
                ))
              : jobs!.map((job) => (
                  <tr
                    key={job.jobId}
                    onClick={() => setSelectedJobId(job.jobId)}
                    className="cursor-pointer border-b border-gray-100 bg-white transition-colors last:border-0 hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
                      <span title={job.jobId}>{shortId(job.jobId)}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {job.finishedAt ? new Date(job.finishedAt).toLocaleString() : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {job.status === "COMPLETED" && job.finishedAt
                        ? (formatDuration(job.createdAt, job.finishedAt) ?? "—")
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {job.backend} · {job.shots.toLocaleString()} shots
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <JobRowStatus jobId={job.jobId} cachedStatus={job.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <JobModeTag backend={job.backend} />
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {selectedJob && (
        <JobDetailModal
          job={{
            uuid: selectedJob.jobId,
            status: selectedJob.status,
            backend: selectedJob.backend,
            shots: selectedJob.shots,
            created_at: selectedJob.createdAt,
            finished_at: selectedJob.finishedAt ?? undefined,
          }}
          onClose={() => setSelectedJobId(null)}
        />
      )}
    </>
  );
}
