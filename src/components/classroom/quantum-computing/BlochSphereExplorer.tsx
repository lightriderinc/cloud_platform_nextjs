"use client";

import { useState } from "react";
import ChalkboardPanel from "../course/ChalkboardPanel";
import ChalkButton from "../course/ChalkButton";
import BlochSphere from "./BlochSphere";
import {
  formatAmplitude,
  probabilities,
  MINUS,
  MINUS_I,
  ONE,
  PLUS,
  PLUS_I,
  ZERO,
  type Qubit,
} from "./qubitMath";

const PRESETS: { label: string; qubit: Qubit }[] = [
  { label: "|0⟩", qubit: ZERO },
  { label: "|1⟩", qubit: ONE },
  { label: "|+⟩", qubit: PLUS },
  { label: "|−⟩", qubit: MINUS },
  { label: "|+i⟩", qubit: PLUS_I },
  { label: "|−i⟩", qubit: MINUS_I },
];

export default function BlochSphereExplorer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = PRESETS[activeIndex];
  const { p0, p1 } = probabilities(active.qubit);

  return (
    <ChalkboardPanel title="Points on the sphere">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2 sm:w-40 sm:flex-col">
          {PRESETS.map((preset, index) => (
            <ChalkButton
              key={preset.label}
              active={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            >
              {preset.label}
            </ChalkButton>
          ))}
        </div>

        <div className="flex flex-1 flex-col items-center gap-4">
          <BlochSphere qubit={active.qubit} />
          <p className="handwritten text-lg text-white">
            {formatAmplitude(active.qubit.alpha)}|0⟩ +{" "}
            {formatAmplitude(active.qubit.beta)}|1⟩
          </p>
          <p className="handwritten text-sm text-gray-200">
            P(0) = {(p0 * 100).toFixed(0)}%, P(1) = {(p1 * 100).toFixed(0)}%
          </p>
        </div>
      </div>
    </ChalkboardPanel>
  );
}
