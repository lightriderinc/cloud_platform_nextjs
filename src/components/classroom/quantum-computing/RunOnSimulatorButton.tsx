"use client";

import { useState } from "react";
import BackendSubmitModal from "@/components/quantum/BackendSubmitModal";
import type { CircuitType } from "@/components/quantum/CircuitSchematic";
import ChalkButton from "../course/ChalkButton";

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
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
