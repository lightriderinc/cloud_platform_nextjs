"use client";

import NewJobModal from "@/components/jobs/NewJobModal";
import LRButton from "@/components/ui/LRButton";
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

        <div className="flex flex-col gap-4 xl:flex-row xl:justify-between xl:items-center mt-4">

          <InfoBox>
            The Light Rider cloud quantum platform is currently under development. <br/>
            You can use the &quot;New job&quot; button to submit sample circuits.
          </InfoBox>

          <LRButton
            type="button"
            onClick={() => setShowModal(true)}
            variant="primary"
            icon={<MdAdd className="text-lg" />}
            iconPosition="right"
            className="min-w-[110px]"
          >
            New Job
          </LRButton>
        </div>
      </div>

      {showModal && <NewJobModal onClose={() => setShowModal(false)} />}
    </>
  );
}
