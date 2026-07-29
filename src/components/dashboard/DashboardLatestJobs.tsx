"use client";

import JobDetailModal from "@/components/jobs/JobDetailModal";
import { fetchJobs, JobRowStatus } from "@/components/jobs/JobsList";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

const LATEST_JOBS_LIMIT = 3;

export default function DashboardLatestJobs() {
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
    return <p className="mt-5 text-sm text-gray-500">Loading jobs…</p>;
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
        The latest jobs you submit will appear here. You can track their
        status and view results once they complete.
      </div>
    );
  }

  const latestJobs = jobs.slice(0, LATEST_JOBS_LIMIT);
  const selectedJob = latestJobs.find((j) => j.jobId === selectedJobId);

  return (
    <>
      <ul className="mt-5 flex flex-col gap-2">
        {latestJobs.map((job) => (
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

      <div className="mt-3 flex justify-end">
        <Link
          href="/jobs"
          className="text-xs font-medium text-gray-600 hover:text-gray-500"
        >
          View all jobs →
        </Link>
      </div>

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
