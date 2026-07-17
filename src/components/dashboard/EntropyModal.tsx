"use client";

import { useEffect, useState } from "react";
import { FaMicrochip } from "react-icons/fa";
import {
  MdArrowBack,
  MdArrowForward,
  MdBrightness7,
  MdCellTower,
  MdCheck,
  MdClose,
  MdContentCopy,
  MdDeviceHub,
  MdEqualizer,
} from "react-icons/md";
import EntropySourceCard from "./EntropySourceCard";

const SOURCES = [
  {
    id: "nist-beacon",
    name: "NIST Beacon",
    description:
      "Publicly verifiable random values from the National Institute of Standards and Technology.",
    icon: <MdCellTower />,
    disabled: false,
  },
  {
    id: "rdseed",
    name: "RDSEED",
    description:
      "Hardware entropy sourced directly from the CPU's on-chip entropy generator.",
    icon: <FaMicrochip />,
    disabled: false,
  },
  {
    id: "curby",
    name: "CURBy",
    description: "Certified Unique Randomness from quantum hardware.",
    icon: <MdDeviceHub />,
    disabled: true,
  },
  {
    id: "iqm-resonance",
    name: "IQM Resonance",
    description:
      "Entropy extracted from IQM quantum processor resonance measurements.",
    icon: <MdEqualizer />,
    disabled: true,
  },
  {
    id: "quantum-light-lab",
    name: "Quantum Light Lab",
    description:
      "Photonic quantum random number generation from light source measurements.",
    icon: <MdBrightness7 />,
    disabled: true,
  },
];

const BYTE_PRESETS = [16, 32, 64, 128, 256, 512];

function generateHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Step = 1 | 2 | 3;

interface EntropyResult {
  sourceName: string;
  bytes: number;
  hex: string;
}

const STEP_LABELS = ["Source", "Configure", "Results"];

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center pt-5">
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const isActive = step === num;
        const isDone = step > num;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div
                className={[
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors",
                  isDone
                    ? "bg-[var(--brand-primary)] text-white"
                    : isActive
                      ? "border-1 border-[var(--brand-primary)] text-[var(--brand-primary)]"
                      : "border-1 border-gray-100 text-gray-400",
                ].join(" ")}
              >
                {isDone ? (
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none" aria-hidden="true">
                    <path
                      d="M1 3L3 5L7 1"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  num
                )}
              </div>
              <span
                className={[
                  "text-xs",
                  isActive ? "text-gray-800" : "text-gray-400",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={[
                  "w-8 h-px mx-2 transition-colors",
                  step > num ? "bg-[var(--brand-primary)]" : "bg-gray-200",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function EntropyModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number>(32);
  const [useCustom, setUseCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [result, setResult] = useState<EntropyResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const activeBytes = useCustom ? parseInt(customInput) || 0 : selectedPreset;
  const sourceData = SOURCES.find((s) => s.id === selectedSourceId);
  const bytesValid = activeBytes >= 1 && activeBytes <= 4096;

  function handleGenerate() {
    if (!sourceData || !bytesValid) return;
    setResult({
      sourceName: sourceData.name,
      bytes: activeBytes,
      hex: generateHex(activeBytes),
    });
    setStep(3);
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleNewRequest() {
    setStep(1);
    setSelectedSourceId(null);
    setSelectedPreset(32);
    setUseCustom(false);
    setCustomInput("");
    setResult(null);
    setCopied(false);
  }

  const subtitles: Record<Step, string> = {
    1: "Select an entropy source",
    2: "Configure your request",
    3: "Your entropy is ready",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Get Entropy"
    >
      <div
        className="relative default-radius w-full max-w-xl bg-white shadow-xl animate-scale-in p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Get Entropy</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center cursor-pointer rounded-full text-lg text-gray-500 hover:text-gray-700"
          >
            <MdClose className="text-lg" />
          </button>
        </div>

        {/* Step indicator */}
        <StepIndicator step={step} />

        {/* Body */}
        <div className="py-5 min-h-[300px]">

          {/* Step 1 — Source selection */}
          {step === 1 && (
            <div className="animate-fade-in-up">
              <p className="text-sm mb-4">
                Choose an entropy source for your request.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SOURCES.map((source) => (
                  <EntropySourceCard
                    key={source.id}
                    id={source.id}
                    name={source.name}
                    description={source.description}
                    icon={source.icon}
                    selected={selectedSourceId === source.id}
                    disabled={source.disabled}
                    onSelect={() => setSelectedSourceId(source.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Configure */}
          {step === 2 && sourceData && (
            <div className="animate-fade-in-up space-y-5">
              {/* Selected source chip */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Source:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 default-radius bg-red-50 border border-[var(--brand-primary)]/25 text-xs font-medium text-[var(--brand-primary)]">
                  <span className="text-sm leading-none">{sourceData.icon}</span>
                  {sourceData.name}
                </span>
              </div>

              {/* Byte presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2.5">
                  Select number of entropy bytes
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {BYTE_PRESETS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(b);
                        setUseCustom(false);
                      }}
                      className={[
                        "px-3 py-1.5 default-radius text-sm font-medium border transition-colors cursor-pointer",
                        !useCustom && selectedPreset === b
                          ? "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]"
                          : "border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      {b}B
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setUseCustom(true)}
                    className={[
                      "px-3 py-1.5 default-radius text-sm font-medium border transition-colors cursor-pointer",
                      useCustom
                        ? "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]"
                        : "border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    Custom
                  </button>
                </div>
                {useCustom && (
                  <input
                    type="number"
                    min={1}
                    max={4096}
                    placeholder="Enter bytes (1–4096)"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    autoFocus
                    className="default-radius w-full border border-gray-100 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
                  />
                )}
              </div>

              {/* Overview */}
              <div className="default-radius border border-gray-100 bg-gray-50 p-4">
                <p className="text-md font-bold text-gray-500 mb-3">
                  Overview
                </p>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Source</p>
                    <p className="font-medium text-gray-800">{sourceData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Bytes</p>
                    <p className="font-medium text-gray-800">
                      {activeBytes > 0 ? activeBytes : <span className="text-gray-400">—</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Output Format</p>
                    <p className="font-medium text-gray-800">Hexadecimal</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Output Length</p>
                    <p className="font-medium text-gray-800">
                      {activeBytes > 0 ? (
                        `${activeBytes * 2} chars`
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Results */}
          {step === 3 && result && (
            <div className="animate-fade-in-up space-y-4">
              {/* Request summary */}
              <div className="default-radius border border-gray-100 bg-gray-50 p-4">
                <p className="text-md font-semibold text-gray-500 mb-3">
                  Request
                </p>
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Source</p>
                    <p className="font-medium text-gray-800">{result.sourceName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Bytes</p>
                    <p className="font-medium text-gray-800">{result.bytes}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Output Format</p>
                    <p className="font-medium text-gray-800">Hexadecimal</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Output Length</p>
                    <p className="font-medium text-gray-800">{result.bytes * 2} chars</p>
                  </div>
                </div>
              </div>

              {/* Entropy output */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-700">Entropy Output</p>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1 default-radius border border-gray-100 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    {copied ? (
                      <MdCheck className="text-green-700" />
                    ) : (
                      <MdContentCopy />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="default-radius border border-gray-800 bg-gray-800 p-4 overflow-x-auto">
                  <p className="font-mono text-xs text-green-300 break-all leading-relaxed">
                    {result.hex}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between py-4">
          {step === 1 && (
            <>
              <div />
              <button
                type="button"
                disabled={!selectedSourceId}
                onClick={() => setStep(2)}
                style={{ backgroundColor: "var(--brand-primary)" }}
                className="default-radius px-4 py-2 text-sm font-medium text-white transition-opacity cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue{" "}
                <MdArrowForward className="inline-block ml-1 text-base align-text-bottom" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 default-radius border border-gray-100 px-4 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <MdArrowBack className="text-base" /> Back
              </button>
              <button
                type="button"
                disabled={!bytesValid}
                onClick={handleGenerate}
                style={{ backgroundColor: "var(--brand-primary)" }}
                className="default-radius px-4 py-2 text-sm font-medium text-white transition-opacity cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generate Entropy
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div />
              <button
                type="button"
                onClick={handleNewRequest}
                className="default-radius border border-gray-100 px-4 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                New Request
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
