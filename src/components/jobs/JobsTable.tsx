"use client";

import { fetchJobs } from "@/lib/lr/client";
import type { Job } from "@/types/job";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import JobResultModal from "./JobResultModal";
import JobTableRow from "./JobTableRow";

export default function JobsTable() {
  const [selected, setSelected] = useState<Job | null>(null);

  // Clean, single fetch. The rows will manage their own updates now.
  const {
    data: jobs = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["lr-jobs"],
    queryFn: fetchJobs,
  });

  if (isLoading) {
    return (
      <div className="default-radius border border-dashed border-gray-300 p-16 text-center text-sm text-gray-500">
        Loading jobs…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="default-radius border border-dashed border-red-300 p-16 text-center text-sm text-red-500">
        Failed to load jobs.
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="default-radius border border-dashed border-gray-300 p-16 text-center text-sm text-gray-500">
        No jobs yet.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto default-radius border border-gray-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-100">
            <tr>
              {["Job ID", "Gate", "Shots / Results", "Status", "Submitted"].map(
                (col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-sm font-bold text-gray-600"
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <JobTableRow
                key={job.uuid}
                job={job}
                onClick={() => setSelected(job)}
              />
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
