"use client";

import DashboardJobRowSkeleton from "@/components/jobs/DashboardJobRowSkeleton";
import JobDetailModal from "@/components/jobs/JobDetailModal";
import { fetchJobs, JobRowStatus } from "@/components/jobs/JobsList";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MdOpenInNew } from "react-icons/md";
import { SiGooglecolab } from "react-icons/si";
import { TbAtom2Filled } from "react-icons/tb";

const LATEST_JOBS_LIMIT = 3;
const COLAB_NOTEBOOKS_BASE_URL =
  "https://colab.research.google.com/github/lightriderinc/cloud_platform_nextjs/blob/main/docs/notebooks";

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
    return (
      <ul className="mt-5 flex flex-col gap-2 animate-pulse">
        {Array.from({ length: LATEST_JOBS_LIMIT }).map((_, i) => (
          <li key={i}>
            <DashboardJobRowSkeleton />
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
      <div className="default-radius border border-dashed border-gray-200 bg-gray-50 p-8 text-center mt-5 text-sm text-gray-500">
        <div className="mb-2 flex items-center justify-center text-4xl text-gray-200">
          <TbAtom2Filled />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">
          Get started with your first quantum job
        </h3>
        <div className="mb-4">
          <span>
            The latest jobs you submit will appear here. You can track their
            status and view results once they complete.
          </span>
        </div>

        <div>
          <a
            href={`${COLAB_NOTEBOOKS_BASE_URL}/quantum-quickstart.ipynb`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 default-radius text-sm font-medium text-gray-700 transition-colors"
          >
            <SiGooglecolab className="text-xl text-gray-400" />
            <span className="brand-link flex flex-row inline-flex items-center gap-1">
              {" "}
              Google Colab quickstart <MdOpenInNew className="text-xs" />
            </span>
          </a>
        </div>
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
                <JobRowStatus
                  jobId={job.jobId}
                  cachedStatus={job.status}
                  finishedAt={job.finishedAt}
                />
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
