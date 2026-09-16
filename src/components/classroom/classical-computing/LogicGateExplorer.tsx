"use client";

import { useState } from "react";
import ChalkboardPanel from "../course/ChalkboardPanel";
import ChalkButton from "../course/ChalkButton";

type GateName = "AND" | "OR" | "NOT" | "XOR";

const GATES: Record<
  GateName,
  { inputs: 1 | 2; evaluate: (a: number, b: number) => number }
> = {
  AND: { inputs: 2, evaluate: (a, b) => (a && b ? 1 : 0) },
  OR: { inputs: 2, evaluate: (a, b) => (a || b ? 1 : 0) },
  XOR: { inputs: 2, evaluate: (a, b) => (a !== b ? 1 : 0) },
  NOT: { inputs: 1, evaluate: (a) => (a ? 0 : 1) },
};

const GATE_ORDER: GateName[] = ["AND", "OR", "NOT", "XOR"];

const TWO_INPUT_ROWS: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];
const ONE_INPUT_ROWS: [number, number][] = [
  [0, 0],
  [1, 0],
];

function bitButtonClass(active: number) {
  return `flex h-14 w-14 items-center justify-center rounded-lg border-2 text-2xl handwritten cursor-pointer transition duration-150 ${
    active
      ? "border-[var(--brand-primary-light)] bg-emerald-700 text-white"
      : "border-gray-200 bg-black/20 text-gray-200 hover:border-gray-100"
  }`;
}

export default function LogicGateExplorer() {
  const [gate, setGate] = useState<GateName>("AND");
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);

  const config = GATES[gate];
  const output = config.evaluate(a, b);
  const rows = config.inputs === 2 ? TWO_INPUT_ROWS : ONE_INPUT_ROWS;

  return (
    <ChalkboardPanel title="Try each gate">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-2">
          {GATE_ORDER.map((name) => (
            <ChalkButton
              key={name}
              active={gate === name}
              onClick={() => setGate(name)}
            >
              {name}
            </ChalkButton>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <button
            type="button"
            onClick={() => setA(1 - a)}
            aria-pressed={a === 1}
            aria-label={`Input A, currently ${a}`}
            className={bitButtonClass(a)}
          >
            {a}
          </button>
          {config.inputs === 2 && (
            <button
              type="button"
              onClick={() => setB(1 - b)}
              aria-pressed={b === 1}
              aria-label={`Input B, currently ${b}`}
              className={bitButtonClass(b)}
            >
              {b}
            </button>
          )}
          <span className="handwritten text-2xl text-white">→</span>
          <div className={bitButtonClass(output).replace("cursor-pointer", "")}>
            {output}
          </div>
        </div>

        <table className="w-fit text-left handwritten text-white">
          <thead>
            <tr>
              <th className="pr-6 font-normal">A</th>
              {config.inputs === 2 && (
                <th className="pr-6 font-normal">B</th>
              )}
              <th className="font-normal">{gate}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([rowA, rowB]) => {
              const isCurrent =
                rowA === a && (config.inputs === 1 || rowB === b);
              return (
                <tr
                  key={`${rowA}${rowB}`}
                  className={
                    isCurrent ? "text-[var(--brand-primary-light)]" : ""
                  }
                >
                  <td className="pr-6">{rowA}</td>
                  {config.inputs === 2 && <td className="pr-6">{rowB}</td>}
                  <td>{config.evaluate(rowA, rowB)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChalkboardPanel>
  );
}
