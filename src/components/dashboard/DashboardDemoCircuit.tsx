"use client";

import LRButton from "@/components/ui/LRButton";
import { useState } from "react";
import { MdArrowForward } from "react-icons/md";
import { PiCircuitryFill } from "react-icons/pi";
import DemoCircuitModal from "./demo/DemoCircuitModal";

export default function DashboardDemoCircuit() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex flex-col w-full gap-10 min-w-50 bg-gray-50 p-4 default-radius border border-gray-50">
        <div className="flex flex-row gap-4">
          <div>
            <PiCircuitryFill className="text-2xl text-gray-400" />
          </div>
          <div className="flex flex-col gap-0">
            <h2 className="text-l font-bold">Submit sample circuits</h2>
            <p className="text-sm text-gray-600">
              Submit a sample circuit to IQM Garnet simulator.
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
        <DemoCircuitModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
}