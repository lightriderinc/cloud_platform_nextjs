"use client";

import { useState } from "react";
import ChalkboardPanel from "../course/ChalkboardPanel";
import ChalkButton from "../course/ChalkButton";

type Outcome = "00" | "01" | "10" | "11";

const STEPS: { label: string; probs: Record<Outcome, number> }[] = [
  { label: "Start: |00⟩", probs: { "00": 1, "01": 0, "10": 0, "11": 0 } },
  {
    label: "After H on qubit 0",
    probs: { "00": 0.5, "01": 0, "10": 0.5, "11": 0 },
  },
  {
    label: "After CNOT (control 0, target 1)",
    probs: { "00": 0.5, "01": 0, "10": 0, "11": 0.5 },
  },
];

const OUTCOMES: Outcome[] = ["00", "01", "10", "11"];

function sample(probs: Record<Outcome, number>): Outcome {
  const r = Math.random();
  let acc = 0;
  for (const outcome of OUTCOMES) {
    acc += probs[outcome];
    if (r < acc) return outcome;
  }
  return "11";
}

export default function BellStateSimulator() {
  const [step, setStep] = useState(0);
  const [counts, setCounts] = useState<Record<Outcome, number>>({
    "00": 0,
    "01": 0,
    "10": 0,
    "11": 0,
  });

  const current = STEPS[step];

  function runShots() {
    const next: Record<Outcome, number> = { "00": 0, "01": 0, "10": 0, "11": 0 };
    for (let i = 0; i < 20; i++) {
      next[sample(current.probs)]++;
    }
    setCounts(next);
  }

  function advance() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    setCounts({ "00": 0, "01": 0, "10": 0, "11": 0 });
  }

  function reset() {
    setStep(0);
    setCounts({ "00": 0, "01": 0, "10": 0, "11": 0 });
  }

  const totalShots = OUTCOMES.reduce((sum, o) => sum + counts[o], 0);

  return (
    <ChalkboardPanel title="Build a Bell pair">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <ChalkButton onClick={advance} disabled={step >= STEPS.length - 1}>
            {step === 0 ? "Apply H to qubit 0" : "Apply CNOT"}
          </ChalkButton>
          <ChalkButton onClick={reset} disabled={step === 0}>
            Reset
          </ChalkButton>
          <span className="handwritten text-lg text-white">{current.label}</span>
        </div>

        <div className="flex gap-4">
          {OUTCOMES.map((outcome) => (
            <div key={outcome} className="flex flex-col items-center gap-1">
              <span className="handwritten text-sm text-gray-200">
                |{outcome}⟩
              </span>
              <div className="h-24 w-10 rounded bg-black/20 overflow-hidden flex flex-col justify-end">
                <div
                  className="bg-emerald-400 transition-all duration-150"
                  style={{ height: `${current.probs[outcome] * 100}%` }}
                />
              </div>
              <span className="handwritten text-sm text-white">
                {(current.probs[outcome] * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ChalkButton onClick={runShots}>Measure both, 20 times</ChalkButton>
          {totalShots > 0 && (
            <span className="handwritten text-lg text-white">
              {OUTCOMES.filter((o) => counts[o] > 0)
                .map((o) => `${o}: ${counts[o]}`)
                .join(", ")}
            </span>
          )}
        </div>

        {step === STEPS.length - 1 && totalShots > 0 && (
          <p className="handwritten text-lg text-white">
            Only 00 and 11 ever show up. The two qubits always agree, even
            though each one is random on its own. That&apos;s entanglement.
          </p>
        )}
      </div>
    </ChalkboardPanel>
  );
}
