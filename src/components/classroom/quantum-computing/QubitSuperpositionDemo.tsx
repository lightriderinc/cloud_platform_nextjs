"use client";

import { useState } from "react";
import ChalkboardPanel from "../course/ChalkboardPanel";
import ChalkButton from "../course/ChalkButton";
import { measureOne, probabilities, type Qubit } from "./qubitMath";

const SHOTS_PER_RUN = 20;

export default function QubitSuperpositionDemo() {
  const [angleDeg, setAngleDeg] = useState(0);
  const [counts, setCounts] = useState<{ zeros: number; ones: number }>({
    zeros: 0,
    ones: 0,
  });

  const theta = (angleDeg * Math.PI) / 180;
  const qubit: Qubit = {
    alpha: { re: Math.cos(theta / 2), im: 0 },
    beta: { re: Math.sin(theta / 2), im: 0 },
  };
  const { p0, p1 } = probabilities(qubit);

  function runShots() {
    let zeros = 0;
    let ones = 0;
    for (let i = 0; i < SHOTS_PER_RUN; i++) {
      if (measureOne(qubit) === 0) zeros++;
      else ones++;
    }
    setCounts({ zeros, ones });
  }

  const totalShots = counts.zeros + counts.ones;

  return (
    <ChalkboardPanel title="Prepare a qubit">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="handwritten text-lg text-white" htmlFor="angle">
            Mix of |0⟩ and |1⟩
          </label>
          <input
            id="angle"
            type="range"
            min={0}
            max={180}
            value={angleDeg}
            onChange={(e) => {
              setAngleDeg(Number(e.target.value));
              setCounts({ zeros: 0, ones: 0 });
            }}
            className="w-full max-w-sm accent-[var(--brand-primary-light)]"
          />
        </div>

        <div className="flex gap-6">
          <div className="flex flex-col gap-1">
            <span className="handwritten text-sm text-gray-200">P(0)</span>
            <div className="h-24 w-10 rounded bg-black/20 overflow-hidden flex flex-col justify-end">
              <div
                className="bg-emerald-400 transition-all duration-150"
                style={{ height: `${p0 * 100}%` }}
              />
            </div>
            <span className="handwritten text-sm text-white">
              {(p0 * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="handwritten text-sm text-gray-200">P(1)</span>
            <div className="h-24 w-10 rounded bg-black/20 overflow-hidden flex flex-col justify-end">
              <div
                className="bg-emerald-400 transition-all duration-150"
                style={{ height: `${p1 * 100}%` }}
              />
            </div>
            <span className="handwritten text-sm text-white">
              {(p1 * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ChalkButton onClick={runShots}>
            Measure {SHOTS_PER_RUN} times
          </ChalkButton>
          {totalShots > 0 && (
            <span className="handwritten text-lg text-white">
              Got 0 {counts.zeros} times and 1 {counts.ones} times.
            </span>
          )}
        </div>
      </div>
    </ChalkboardPanel>
  );
}
