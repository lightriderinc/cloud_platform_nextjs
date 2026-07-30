"use client";

import LRButton from "@/components/ui/LRButton";
import EntropyRequestModal from "@/components/entropy/EntropyRequestModal";
import { useState } from "react";
import { FaDice } from "react-icons/fa";
import { MdArrowForward } from "react-icons/md";

export default function DashboardDemoEntropy() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex flex-col w-full gap-10 min-w-50 bg-gray-50 p-4 default-radius border border-gray-50">
        <div className="flex flex-row gap-4">
          <div>
            <FaDice className="text-2xl text-gray-400" />
          </div>
          <div className="flex flex-col gap-0">
            <h2 className="text-l font-bold">Get Entropy</h2>
            <p className="text-sm text-gray-600">
              Generate certified entropy from hardware and beacon sources.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <LRButton
            type="button"
            onClick={() => setShowModal(true)}
            variant="primary"
            icon={<MdArrowForward className="text-lg" />}
            iconPosition="right"
            className="min-w-[110px]"
          >
            Try it out
          </LRButton>
        </div>
      </div>

      {showModal && (
        <EntropyRequestModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
