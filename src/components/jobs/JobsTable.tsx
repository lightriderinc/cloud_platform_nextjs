"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Job } from "@/types/job";
import { fetchJobs } from "@/lib/lr/client";
import JobStatusBadge from "./JobStatusBadge";
import JobResultModal from "./JobResultModal";

const ACTIVE = new Set(["WAITING", "PROCESSING"]);

export default function JobsTable() {
  const [selected, setSelected] = useState<Job | null>(null);

  const { data: jobs = [], isLoading, isError } = useQuery({
    queryKey: ["lr-jobs"],
    queryFn: fetchJobs,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((j: Job) => ACTIVE.has(j.status)) ? 5000 : false,
  });

  if (isLoading) {
    return (
      <div className="rounded border border-dashed border-gray-300 p-16 text-center text-sm text-gray-500">
        Loading jobs…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded border border-dashed border-red-300 p-16 text-center text-sm text-red-500">
        Failed to load jobs.
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded border border-dashed border-gray-300 p-16 text-center text-sm text-gray-500">
        No jobs yet.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Job ID", "Gate", "Shots", "Status", "Submitted"].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <tr
                key={job.uuid}
                onClick={() => setSelected(job)}
                className="cursor-pointer bg-white transition-colors hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                  {job.uuid ? `${job.uuid.slice(0, 8)}…` : "—"}
                </td>
                <td className="px-4 py-3 text-gray-800">{job.gate ?? "—"}</td>
                <td className="px-4 py-3 text-gray-800">
                  {job.shots != null ? job.shots.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <JobStatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {job.created_at ? new Date(job.created_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <JobResultModal job={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
