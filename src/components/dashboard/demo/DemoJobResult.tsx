"use client";

import JobResultView from "@/components/jobs/JobResultView";
import type { Job } from "@/types/job";

interface Props {
  job: Job;
  onTryAnother: () => void;
}

export default function DemoJobResult({ job, onTryAnother }: Props) {
  return (
    <JobResultView
      job={job}
      footer={
        <button
          type="button"
          onClick={onTryAnother}
          className="default-radius mt-1 w-fit cursor-pointer border border-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          ← Try Another
        </button>
      }
    />
  );
}
