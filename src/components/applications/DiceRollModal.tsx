"use client";

import DiceIcon, { type DiceSides } from "@/components/dice/DiceIcon";
import LRButton from "@/components/ui/LRButton";
import { useState } from "react";
import { MdArrowBack, MdArrowForward, MdRefresh } from "react-icons/md";
import EntropySourceSelector, { SOURCES } from "./EntropySourceSelector";
import ModalShell from "./ModalShell";
import StepIndicator from "./StepIndicator";

const DICE: { sides: DiceSides; label: string; desc: string }[] = [
  { sides: 2, label: "d2", desc: "Coin flip" },
  { sides: 3, label: "d3", desc: "3-sided" },
  { sides: 4, label: "d4", desc: "Tetrahedron" },
  { sides: 6, label: "d6", desc: "Standard cube" },
  { sides: 8, label: "d8", desc: "Octahedron" },
  { sides: 10, label: "d10", desc: "Trapezoid" },
  { sides: 12, label: "d12", desc: "Dodecahedron" },
  { sides: 20, label: "d20", desc: "Icosahedron" },
];

const STEPS = ["Die", "Source", "Result"];

type Step = 1 | 2 | 3;

interface RollResult {
  sides: number;
  value: number;
  sourceName: string;
}

function rollDie(sides: number): number {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % sides) + 1;
}

export default function DiceRollModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [selectedSides, setSelectedSides] = useState<number | null>(null);
  const [hoveredSides, setHoveredSides] = useState<number | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [result, setResult] = useState<RollResult | null>(null);

  const dieData = DICE.find((d) => d.sides === selectedSides);
  const sourceData = SOURCES.find((s) => s.id === selectedSourceId);

  function handleRoll() {
    if (!selectedSides || !sourceData) return;
    setResult({
      sides: selectedSides,
      value: rollDie(selectedSides),
      sourceName: sourceData.name,
    });
    setStep(3);
  }

  function handleRollAgain() {
    if (!selectedSides || !sourceData) return;
    setResult({
      sides: selectedSides,
      value: rollDie(selectedSides),
      sourceName: sourceData.name,
    });
  }

  function handleReset() {
    setStep(1);
    setSelectedSides(null);
    setSelectedSourceId(null);
    setResult(null);
  }

  return (
    <ModalShell title="True Random Dice Roll" onClose={onClose}>
      <StepIndicator steps={STEPS} current={step} />

      <div className="py-5 min-h-[300px]">
        {/* Step 1 — Die selection */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <p className="text-sm mb-4">Select a die to roll.</p>
            <div className="grid grid-cols-4 gap-2">
              {DICE.map((die) => (
                <button
                  key={die.sides}
                  type="button"
                  onClick={() => setSelectedSides(die.sides)}
                  onMouseEnter={() => setHoveredSides(die.sides)}
                  onMouseLeave={() => setHoveredSides(null)}
                  className={[
                    "relative flex flex-col items-center justify-center gap-1 py-4 px-2 default-radius border transition-all duration-150 cursor-pointer",
                    selectedSides === die.sides
                      ? "border-[var(--brand-primary)] bg-red-50"
                      : "border-gray-100 bg-white card-hover-primary",
                  ].join(" ")}
                >
                  {selectedSides === die.sides && (
                    <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center bg-[var(--brand-primary)]">
                      <svg
                        width="7"
                        height="5"
                        viewBox="0 0 8 6"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M1 3L3 5L7 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                  <DiceIcon
                    sides={die.sides}
                    size={30}
                    hovered={hoveredSides === die.sides}
                    selected={selectedSides === die.sides}
                    color="var(--gray-500)"
                    hoverColor="#f87c56"
                    selectedColor="var(--brand-primary)"
                  />
                  <span
                    className={[
                      "text-lg font-bold leading-tight mt-2",
                      selectedSides === die.sides
                        ? "text-[var(--brand-primary)]"
                        : "text-gray-700",
                    ].join(" ")}
                  >
                    {die.label}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5 text-center leading-tight">
                    {die.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Source selection */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-gray-500">Die:</span>
              <span className="inline-flex items-center px-2.5 py-1 default-radius bg-red-50 border border-[var(--brand-primary)]/25 text-xs font-medium text-[var(--brand-primary)]">
                {dieData?.label}
              </span>
            </div>
            <p className="text-sm mb-4">
              Choose an entropy source for your roll.
            </p>
            <EntropySourceSelector
              selectedId={selectedSourceId}
              onSelect={setSelectedSourceId}
            />
          </div>
        )}

        {/* Step 3 — Result */}
        {step === 3 && result && (
          <div className="animate-fade-in-up space-y-4">
            <div className="default-radius border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-500 mb-3">
                Roll Details
              </p>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Die</p>
                  <p className="font-medium text-gray-800">d{result.sides}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Entropy Source</p>
                  <p className="font-medium text-gray-800">
                    {result.sourceName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Range</p>
                  <p className="font-medium text-gray-800">
                    1 – {result.sides}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-4 gap-2">
              <p className="text-sm font-bold text-gray-500">Result</p>

              <div
                className="relative flex w-32 h-32 default-radius border-2 bg-red-50 items-center justify-center"
                style={{ borderColor: "var(--brand-primary)" }}
              >
                <div className="absolute top-1 left-1 z-10 flex items-center justify-center">
                  <DiceIcon
                    sides={result.sides as DiceSides}
                    size={20}
                    selected
                    selectedColor="var(--brand-primary)"
                  />
                </div>
                <div className="absolute top-1 right-1 z-10 flex items-center justify-center">
                  <span className="text-xs font-semibold" style={{ color: "var(--brand-primary)" }}>d{result.sides}</span>
                </div>
                <span
                  className="text-5xl font-bold"
                  style={{ color: "var(--brand-primary)" }}
                >
                  {result.value}
                </span>
              </div>
              <p className="text-sm text-gray-400">out of {result.sides}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-gray-100">
        {step === 1 && (
          <>
            <div />
            <LRButton
              type="button"
              variant="primary"
              disabled={selectedSides === null}
              onClick={() => setStep(2)}
              icon={<MdArrowForward />}
              iconPosition="right"
            >
              Continue
            </LRButton>
          </>
        )}

        {step === 2 && (
          <>
            <LRButton
              type="button"
              variant="secondary-outline"
              onClick={() => setStep(1)}
              icon={<MdArrowBack />}
              iconPosition="left"
            >
              Back
            </LRButton>
            <LRButton
              type="button"
              variant="primary"
              disabled={!selectedSourceId}
              onClick={handleRoll}
            >
              Roll Die
            </LRButton>
          </>
        )}

        {step === 3 && (
          <>
            <div />
            <div className="flex gap-2">
              <LRButton
                type="button"
                variant="secondary-outline"
                onClick={handleRollAgain}
                icon={<MdRefresh />}
                iconPosition="left"
              >
                Roll Again
              </LRButton>
              <LRButton
                type="button"
                variant="secondary-outline"
                onClick={handleReset}
              >
                New Roll
              </LRButton>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
