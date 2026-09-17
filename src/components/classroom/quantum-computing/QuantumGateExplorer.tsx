"use client";

import { useState } from "react";
import ChalkboardPanel from "../course/ChalkboardPanel";
import ChalkButton from "../course/ChalkButton";
import BlochSphere from "./BlochSphere";
import RunOnSimulatorButton from "./RunOnSimulatorButton";
import { applyGate, formatAmplitude, ZERO, type GateName, type Qubit } from "./qubitMath";

const GATE_ORDER: GateName[] = ["X", "Y", "Z", "H", "S"];

export default function QuantumGateExplorer() {
  const [applied, setApplied] = useState<GateName[]>([]);

  const qubit: Qubit = applied.reduce((state, gate) => applyGate(gate, state), ZERO);

  function pressGate(gate: GateName) {
    setApplied((prev) => [...prev, gate]);
  }

  function reset() {
    setApplied([]);
  }

  return (
    <ChalkboardPanel title="Apply gates to a qubit">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-4 sm:w-48">
          <div className="flex flex-wrap gap-2">
            {GATE_ORDER.map((gate) => (
              <ChalkButton key={gate} onClick={() => pressGate(gate)}>
                {gate}
              </ChalkButton>
            ))}
          </div>
          <ChalkButton onClick={reset} disabled={applied.length === 0}>
            Reset to |0⟩
          </ChalkButton>
          <p className="handwritten text-sm text-gray-200">
            {applied.length === 0
              ? "Starting from |0⟩"
              : `Applied: ${applied.join(" → ")}`}
          </p>
        </div>

        <div className="flex flex-1 flex-col items-center gap-4">
          <BlochSphere qubit={qubit} />
          <p className="handwritten text-lg text-white">
            {formatAmplitude(qubit.alpha)}|0⟩ + {formatAmplitude(qubit.beta)}|1⟩
          </p>
        </div>
      </div>

      <div className="mt-6 border-t border-white/10 pt-6 flex flex-col gap-3">
        <p className="handwritten text-lg text-white">
          Press H once and the qubit lands exactly on the equator, an equal
          mix of |0⟩ and |1⟩. That single gate is the circuit Light Rider&apos;s
          simulator runs when you submit the H gate sample.
        </p>
        <div>
          <RunOnSimulatorButton circuit="h" label="Run an H gate on the simulator" />
        </div>
      </div>
    </ChalkboardPanel>
  );
}
