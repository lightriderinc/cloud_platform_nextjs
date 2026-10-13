"use client";

import { useState } from "react";
import ChalkboardPanel from "../course/ChalkboardPanel";
import ChalkButton from "../course/ChalkButton";
import GateSymbol from "./GateSymbol";

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

        <div className="overflow-x-auto">
          <GateSymbol
            gate={gate}
            a={a}
            b={b}
            inputs={config.inputs}
            output={output}
            onToggleA={() => setA(1 - a)}
            onToggleB={() => setB(1 - b)}
          />
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
