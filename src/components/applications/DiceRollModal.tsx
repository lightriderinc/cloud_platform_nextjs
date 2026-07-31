"use client";

import DiceIcon, { type DiceSides } from "@/components/dice/DiceIcon";
import LRButton from "@/components/ui/LRButton";
import { fetchCurbyEntropy } from "@/lib/curby/client";
import {
  rollFromBytes,
  type BeaconEntropy,
  type BeaconProvenance,
} from "@/lib/entropy/beacon";
import { fetchIqmEntropy } from "@/lib/iqm/entropy";
import { fetchNistEntropy } from "@/lib/nist/client";
import { useRef, useState } from "react";
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

// Entropy-source ids (see EntropySourceSelector) backed by a live external
// service — randomness beacons, or a quantum circuit run on an IQM mock. Each
// maps to a client returning normalized BeaconEntropy (bytes + provenance);
// adding another live source is just another entry here.
const LIVE_ENTROPY_FETCHERS: Record<string, () => Promise<BeaconEntropy>> = {
  curby: fetchCurbyEntropy,
  "nist-beacon": fetchNistEntropy,
  "iqm-resonance": fetchIqmEntropy,
};

// Max pulse/job fetches per single roll. Beacons return many bytes per pulse so
// one fetch is plenty, but the IQM circuit yields a single byte per job that can
// be rejection-sampled away — a few attempts make a fall-back to local entropy
// vanishingly rare.
const MAX_REFILL_ATTEMPTS = 6;

interface RollResult {
  sides: number;
  value: number;
  sourceName: string;
  /** Present when the roll was sourced from a live beacon. */
  beacon?: BeaconProvenance;
  /** True if a live source was requested but we fell back to local entropy. */
  fellBack?: boolean;
}

// Local CSPRNG fallback, used for non-beacon sources and if a live beacon is
// unreachable. Rejection-sampled so the mapping to faces stays unbiased.
function rollDieLocal(sides: number): number {
  const limit = 256 - (256 % sides);
  const arr = new Uint8Array(1);
  do {
    crypto.getRandomValues(arr);
  } while (arr[0] >= limit);
  return (arr[0] % sides) + 1;
}

export default function DiceRollModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [selectedSides, setSelectedSides] = useState<number | null>(null);
  const [hoveredSides, setHoveredSides] = useState<number | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [result, setResult] = useState<RollResult | null>(null);
  const [rolling, setRolling] = useState(false);

  // Buffered pulse/job sample — one beacon pulse holds many bytes, so successive
  // rolls consume the next byte of the same sample (giving different values from
  // one pulse) and only re-fetch once its bytes are spent or the source changes.
  const entropyBuffer = useRef<{
    sourceId: string;
    entropy: BeaconEntropy;
    offset: number;
  } | null>(null);

  const dieData = DICE.find((d) => d.sides === selectedSides);
  const sourceData = SOURCES.find((s) => s.id === selectedSourceId);

  // Draw one die value for the chosen source. Live sources consume bytes from a
  // buffered sample (re-fetching when exhausted or the source changed); every
  // other source uses the local CSPRNG.
  async function drawRoll(sides: number, sourceId: string): Promise<RollResult> {
    const sourceName = SOURCES.find((s) => s.id === sourceId)?.name ?? sourceId;
    const fetchEntropy = LIVE_ENTROPY_FETCHERS[sourceId];

    if (!fetchEntropy) {
      return { sides, value: rollDieLocal(sides), sourceName };
    }

    try {
      // Refill on first use, when the source changed, or once the current
      // sample's bytes are spent.
      for (let attempt = 0; attempt < MAX_REFILL_ATTEMPTS; attempt++) {
        // `buf` aliases the object held in the ref, so mutating buf.offset
        // below persists across rolls.
        let buf = entropyBuffer.current;
        if (
          !buf ||
          buf.sourceId !== sourceId ||
          buf.offset >= buf.entropy.bytes.length
        ) {
          buf = { sourceId, entropy: await fetchEntropy(), offset: 0 };
          entropyBuffer.current = buf;
        }
        const draw = rollFromBytes(buf.entropy.bytes, buf.offset, sides);
        if (draw) {
          buf.offset = draw.nextOffset;
          return {
            sides,
            value: draw.value,
            sourceName,
            beacon: buf.entropy.provenance,
          };
        }
        // Sample exhausted without an accepted byte — force a refetch.
        entropyBuffer.current = null;
      }
      throw new Error("Exhausted entropy source without a usable byte.");
    } catch {
      // Live source unavailable — keep the roll working with local entropy and
      // flag it so the UI stays honest about the source.
      return { sides, value: rollDieLocal(sides), sourceName, fellBack: true };
    }
  }

  async function performRoll(advanceToResult: boolean) {
    if (!selectedSides || !sourceData || rolling) return;
    setRolling(true);
    try {
      const rolled = await drawRoll(selectedSides, sourceData.id);
      setResult(rolled);
      if (advanceToResult) setStep(3);
    } finally {
      setRolling(false);
    }
  }

  function handleReset() {
    setStep(1);
    setSelectedSides(null);
    setSelectedSourceId(null);
    setResult(null);
    entropyBuffer.current = null;
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
                {result.beacon?.pulse !== undefined && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Beacon Pulse</p>
                    <p className="font-medium text-gray-800">
                      #{result.beacon.pulse}
                    </p>
                  </div>
                )}
              </div>

              {result.beacon && (
                <p className="mt-3 text-2xs text-gray-400 leading-snug break-all">
                  {result.beacon.label} ·{" "}
                  {new Date(result.beacon.timestamp).toUTCString()} ·{" "}
                  {result.beacon.reference}
                </p>
              )}

              {result.fellBack && (
                <p
                  className="mt-3 text-xs leading-snug"
                  style={{ color: "var(--brand-tertiary)" }}
                >
                  The {result.sourceName} beacon was unavailable — this roll
                  used a local fallback source.
                </p>
              )}
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
              disabled={!selectedSourceId || rolling}
              onClick={() => performRoll(true)}
            >
              {rolling ? "Rolling…" : "Roll Die"}
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
                disabled={rolling}
                onClick={() => performRoll(false)}
                icon={<MdRefresh />}
                iconPosition="left"
              >
                {rolling ? "Rolling…" : "Roll Again"}
              </LRButton>
              <LRButton
                type="button"
                variant="secondary-outline"
                disabled={rolling}
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
