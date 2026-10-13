"use client";

import { useState } from "react";
import ChalkboardPanel from "../course/ChalkboardPanel";
import HalfAdderCircuit from "./HalfAdderCircuit";

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
      <div className="flex flex-col">
        <div className="overflow-x-auto mb-6">
          <HalfAdderCircuit
            a={a}
            b={b}
            sum={sum}
            carry={carry}
            onToggleA={() => setA(1 - a)}
            onToggleB={() => setB(1 - b)}
          />
        </div>
      </div>
      <p className="handwritten text-lg text-white">
        {a} + {b} = {carry}
        {sum} in binary
      </p>
    </ChalkboardPanel>
  );
}
