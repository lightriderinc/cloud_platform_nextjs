"use client";

import { useState } from "react";
import { PiCircuitryFill } from "react-icons/pi";
import DemoCircuitModal from "./demo/DemoCircuitModal";

export default function DashboardDemoCircuit() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)} className="flex w-64 cursor-pointer">
        <div className="flex flex-col h-full w-full bg-gray-100 p-5 border border-gray-100 default-radius card-hover-primary gap-3">
          <PiCircuitryFill className="text-5xl text-gray-200" />
          <h3 className="flex gap-1 text-left text-md font-medium">
            Submit sample circuits
          </h3>
          <div className="flex text-left">
            <p className="text-sm text-gray-500">
              Submit a sample circuit to IQM Garnet simulator.
            </p>
          </div>
        </div>
      </button>

      {showModal && <DemoCircuitModal onClose={() => setShowModal(false)} />}
    </>
  );
}
