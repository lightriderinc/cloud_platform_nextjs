"use client";

import EntropyRequestModal from "@/components/entropy/EntropyRequestModal";
import { useState } from "react";
import { FaDice } from "react-icons/fa";

export default function DashboardDemoEntropy() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)} className="flex w-64 cursor-pointer">
        <div className="flex flex-col h-full w-full bg-gray-100 p-5 border border-gray-100 default-radius card-hover-primary gap-3">
          <FaDice className="text-5xl text-gray-200" />
          <h3 className="flex text-left gap-1 text-md font-medium">
            Get Entropy
          </h3>
          <div className="flex text-left">
            <p className="text-sm text-gray-500">
              Generate certified entropy from hardware and beacon sources.
            </p>
          </div>
        </div>
      </button>

      {showModal && <EntropyRequestModal onClose={() => setShowModal(false)} />}
    </>
  );
}
