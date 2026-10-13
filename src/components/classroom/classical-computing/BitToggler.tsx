"use client";

import { useMemo, useState } from "react";
import ChalkboardPanel from "../course/ChalkboardPanel";
import ChalkButton from "../course/ChalkButton";

const BIT_COUNT = 4;

function randomTarget() {
  return Math.floor(Math.random() * 2 ** BIT_COUNT);
}

export default function BitToggler() {
  const [bits, setBits] = useState<number[]>(() => Array(BIT_COUNT).fill(0));
  const [target, setTarget] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(
    null,
  );

  const value = useMemo(
    () =>
      bits.reduce(
        (sum, bit, index) => sum + bit * 2 ** (BIT_COUNT - 1 - index),
        0,
      ),
    [bits],
  );

  function toggleBit(index: number) {
    setBits((prev) => prev.map((bit, i) => (i === index ? 1 - bit : bit)));
    setFeedback(null);
  }

  function startChallenge() {
    setTarget(randomTarget());
    setFeedback(null);
  }

  function checkAnswer() {
    setFeedback(value === target ? "correct" : "incorrect");
  }

  return (
    <ChalkboardPanel title="Flip the bits">
      <div className="flex flex-col gap-6">
        <div className="flex gap-3">
          {bits.map((bit, index) => (
            <button
              key={index}
              type="button"
              onClick={() => toggleBit(index)}
              aria-pressed={bit === 1}
              aria-label={`Bit worth ${2 ** (BIT_COUNT - 1 - index)}, currently ${bit}`}
              className={`flex h-14 w-14 items-center justify-center rounded-lg border-2 text-2xl handwritten cursor-pointer transition duration-150 ${
                bit
                  ? "border-[var(--brand-primary-light)] bg-emerald-700 text-white"
                  : "border-gray-200 bg-black/20 text-gray-200 hover:border-gray-100"
              }`}
            >
              {bit}
            </button>
          ))}
        </div>

        <p className="handwritten text-xl text-white">
          Decimal value: <span className="text-2xl">{value}</span>
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <ChalkButton onClick={startChallenge}>
            {target === null ? "Try a challenge" : "New number"}
          </ChalkButton>
          {target !== null && (
            <>
              <span className="handwritten text-lg text-white">
                Set the bits to make {target}
              </span>
              <ChalkButton onClick={checkAnswer}>Check</ChalkButton>
            </>
          )}
        </div>

        {feedback === "correct" && (
          <p className="handwritten text-lg text-emerald-300">
            That&apos;s {target}.
          </p>
        )}
        {feedback === "incorrect" && (
          <p className="handwritten text-lg text-red-300">
            Those bits currently make {value}, not {target}.
          </p>
        )}
      </div>
    </ChalkboardPanel>
  );
}
