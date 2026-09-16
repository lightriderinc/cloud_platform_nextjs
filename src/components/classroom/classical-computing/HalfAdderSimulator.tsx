"use client";

import { useState } from "react";
import ChalkboardPanel from "../course/ChalkboardPanel";

function bitButtonClass(active: number) {
  return `flex h-14 w-14 items-center justify-center rounded-lg border-2 text-2xl handwritten cursor-pointer transition duration-150 ${
    active
      ? "border-[var(--brand-primary-light)] bg-emerald-700 text-white"
      : "border-gray-200 bg-black/20 text-gray-200 hover:border-gray-100"
  }`;
}

function outputClass(active: number) {
  return `flex h-14 w-14 items-center justify-center rounded-lg border-2 text-2xl handwritten ${
    active
      ? "border-[var(--brand-primary-light)] bg-emerald-700 text-white"
      : "border-gray-200 bg-black/20 text-gray-200"
  }`;
}

export default function HalfAdderSimulator() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);

  const sum = a !== b ? 1 : 0;
  const carry = a && b ? 1 : 0;

  return (
    <ChalkboardPanel title="Half adder">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setA(1 - a)}
              aria-pressed={a === 1}
              aria-label={`Input A, currently ${a}`}
              className={bitButtonClass(a)}
            >
              {a}
            </button>
            <span className="handwritten text-sm text-gray-200">A</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setB(1 - b)}
              aria-pressed={b === 1}
              aria-label={`Input B, currently ${b}`}
              className={bitButtonClass(b)}
            >
              {b}
            </button>
            <span className="handwritten text-sm text-gray-200">B</span>
          </div>
          <span className="handwritten text-2xl text-white">→</span>
          <div className="flex flex-col items-center gap-2">
            <div className={outputClass(sum)}>{sum}</div>
            <span className="handwritten text-sm text-gray-200">Sum</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className={outputClass(carry)}>{carry}</div>
            <span className="handwritten text-sm text-gray-200">Carry</span>
          </div>
        </div>
        <p className="handwritten text-lg text-white">
          {a} + {b} = {carry}
          {sum} in binary
        </p>
      </div>
    </ChalkboardPanel>
  );
}
