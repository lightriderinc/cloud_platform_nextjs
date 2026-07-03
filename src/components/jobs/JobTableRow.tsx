"use client";

import { fetchJobDetail, fetchJobResult } from "@/lib/lr/client";
import type { Job } from "@/types/job";
import { useQuery } from "@tanstack/react-query";
import JobStatusBadge from "./JobStatusBadge";

const TERMINAL = new Set(["COMPLETED", "FAILED", "ABORTED"]);

interface JobTableRowProps {
  job: Job;
  onClick: () => void;
}

export default function JobTableRow({ job, onClick }: JobTableRowProps) {
  // 1. Poll the lightweight detail endpoint ONLY for active jobs.
  const { data: detail } = useQuery({
    queryKey: ["lr-job-detail", job.uuid],
    queryFn: () => fetchJobDetail(job.uuid),
    enabled: !TERMINAL.has(job.status),
    retry: 0,
    refetchInterval: (query) => {
      const status = query?.state?.data?.status ?? job.status;
      return TERMINAL.has(status) ? false : 5000;
    },
  });

  // The true current status (merges initial list data with live detail data)
  const currentStatus = detail?.status ?? job.status;

  // 2. Fetch results ONLY if completed
  const { data: counts } = useQuery({
    queryKey: ["lr-job-result", job.uuid],
    queryFn: () => fetchJobResult(job.uuid),
    enabled: currentStatus === "COMPLETED",
    staleTime: Infinity,
  });

  const totalCounts = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer bg-white transition-colors hover:bg-gray-50"
    >
      <td className="px-4 py-3 font-mono text-xs text-gray-600">
        {job.uuid ? `${job.uuid.slice(0, 8)}…` : "—"}
      </td>
      <td className="px-4 py-3 text-gray-800">{job.gate ?? "—"}</td>
      
      <td className="px-4 py-3 text-gray-800">
        {totalCounts != null 
          ? totalCounts.toLocaleString() 
          : (job.shots != null ? job.shots.toLocaleString() : "—")}
      </td>
      
      <td className="px-4 py-3">
        {/* Now reacts instantly to its own local polling! */}
        <JobStatusBadge status={currentStatus} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {job.created_at ? new Date(job.created_at).toLocaleString() : "—"}
      </td>
    </tr>
  );
}