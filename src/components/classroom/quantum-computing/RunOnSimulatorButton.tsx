"use client";

import BackendSubmitModal from "@/components/quantum/BackendSubmitModal";
import type { CircuitType } from "@/components/quantum/CircuitSchematic";
import Link from "next/link";
import { useState } from "react";
import { MdCheckCircleOutline } from "react-icons/md";
import ChalkButton from "../course/ChalkButton";

const SUCCESS_MESSAGE = (
  <div className="flex items-start gap-2 border-l-2 border-emerald-500 bg-emerald-50 py-2 pl-3 pr-6 default-radius">
    <MdCheckCircleOutline className="mt-0.5 shrink-0 text-lg text-emerald-600" />
    <p className="text-xs text-black">
      Nice work, that&apos;s a real quantum circuit running on a quantum
      simulator. You can come back and check on it, or any other submission,
      from the{" "}
      <Link href="/jobs" className="brand-link font-medium">
        Jobs
      </Link>{" "}
      section any time.
    </p>
  </div>
);

export default function RunOnSimulatorButton({
  circuit,
  label,
}: {
  circuit: CircuitType;
  label: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ChalkButton onClick={() => setOpen(true)}>{label}</ChalkButton>
      {open && (
        <BackendSubmitModal
          backend="iqm-garnet-mock"
          initialCircuit={circuit}
          title="Run on the IQM Garnet simulator"
          successMessage={SUCCESS_MESSAGE}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
