"use client";

import JobResultView from "@/components/jobs/JobResultView";
import type { Job } from "@/types/job";
import { useEffect } from "react";
import { MdClose } from "react-icons/md";

export default function JobDetailModal({
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Job details"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto default-radius bg-white p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg text-gray-500 hover:text-gray-700"
        >
          <MdClose />
        </button>
        <h2 className="mb-6 text-lg font-semibold">Job Details</h2>
        <JobResultView job={job} />
      </div>
    </div>
  );
}
