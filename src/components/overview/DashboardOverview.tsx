"use client";

import NewJobModal from "@/components/jobs/NewJobModal";
import { fetchJobs } from "@/lib/lr/client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MdAdd } from "react-icons/md";
import InfoBox from "../InfoBox";

export default function DashboardOverview() {
  const [showModal, setShowModal] = useState(false);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["lr-jobs"],
    queryFn: fetchJobs,
  });

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="default-radius">
          <p className="text-sm font-medium tracking-wide text-gray-800">
            Total Submitted Jobs
          </p>
          <p className="mt-2 text-4xl font-semibold text-gray-900">
            {isLoading ? "—" : jobs.length.toLocaleString()}
          </p>
        </div>

        <div className="flex flex-row justify-between mt-4">

          <InfoBox>
            The Light Rider cloud quantum platform is currently under development. <br/>
            You can use the &quot;New job&quot; button to submit sample circuits.
          </InfoBox>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: "var(--brand-primary)" }}
            className="default-radius pl-4 pr-3 py-2.5 text-sm font-medium text-white cursor-pointer transition-opacity hover:opacity-90"
          >
            New Job <MdAdd className="inline-block ml-1 text-lg" />
          </button>
        </div>
      </div>

      {showModal && <NewJobModal onClose={() => setShowModal(false)} />}
    </>
  );
}
