"use client";

import { useState } from "react";
import {
  MdArrowBack,
  MdArrowForward,
  MdCheck,
  MdContentCopy,
  MdRefresh,
} from "react-icons/md";
import EntropySourceSelector, { SOURCES } from "./EntropySourceSelector";
import ModalShell from "./ModalShell";
import StepIndicator from "./StepIndicator";

const LENGTH_PRESETS = [8, 12, 16, 24, 32, 64];

const CHAR_SETS = [
  { id: "lowercase", label: "Lowercase", chars: "abcdefghijklmnopqrstuvwxyz" },
  { id: "uppercase", label: "Uppercase", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  { id: "numbers", label: "Numbers", chars: "0123456789" },
  { id: "symbols", label: "Symbols", chars: "!@#$%^&*()-_=+[]{}|;:,.<>?" },
];

const STEPS = ["Source", "Configure", "Result"];

type Step = 1 | 2 | 3;

interface PasswordResult {
  password: string;
  length: number;
  sourceName: string;
}

function generatePassword(length: number, charPool: string): string {
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => charPool[n % charPool.length]).join("");
}

export default function PasswordModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedLength, setSelectedLength] = useState<number>(16);
  const [useCustom, setUseCustom] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [enabledSets, setEnabledSets] = useState<Set<string>>(
    new Set(["lowercase", "uppercase", "numbers", "symbols"])
  );
  const [result, setResult] = useState<PasswordResult | null>(null);
  const [copied, setCopied] = useState(false);

  const sourceData = SOURCES.find((s) => s.id === selectedSourceId);
  const activeLength = useCustom ? parseInt(customInput) || 0 : selectedLength;
  const lengthValid = activeLength >= 4 && activeLength <= 256;
  const charPool = CHAR_SETS.filter((s) => enabledSets.has(s.id))
    .map((s) => s.chars)
    .join("");

  function toggleSet(id: string) {
    setEnabledSets((prev) => {
      if (prev.has(id) && prev.size === 1) return prev;
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleGenerate() {
    if (!sourceData || !lengthValid) return;
    setResult({
      password: generatePassword(activeLength, charPool),
      length: activeLength,
      sourceName: sourceData.name,
    });
    setStep(3);
  }

  function handleRegenerate() {
    if (!sourceData || !lengthValid) return;
    setResult({
      password: generatePassword(activeLength, charPool),
      length: activeLength,
      sourceName: sourceData.name,
    });
    setCopied(false);
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setStep(1);
    setSelectedSourceId(null);
    setSelectedLength(16);
    setUseCustom(false);
    setCustomInput("");
    setEnabledSets(new Set(["lowercase", "uppercase", "numbers", "symbols"]));
    setResult(null);
    setCopied(false);
  }

  return (
    <ModalShell title="Secure Password Generator" onClose={onClose}>
      <StepIndicator steps={STEPS} current={step} />

      <div className="py-5 min-h-[300px]">
        {/* Step 1 — Source selection */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <p className="text-sm mb-4">
              Choose an entropy source for your password.
            </p>
            <EntropySourceSelector
              selectedId={selectedSourceId}
              onSelect={setSelectedSourceId}
            />
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

            {/* Length presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2.5">
                Password length
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {LENGTH_PRESETS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      setSelectedLength(l);
                      setUseCustom(false);
                    }}
                    className={[
                      "px-3 py-1.5 default-radius text-sm font-medium border transition-colors cursor-pointer",
                      !useCustom && selectedLength === l
                        ? "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {l}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setUseCustom(true)}
                  className={[
                    "px-3 py-1.5 default-radius text-sm font-medium border transition-colors cursor-pointer",
                    useCustom
                      ? "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                  ].join(" ")}
                >
                  Custom
                </button>
              </div>
              {useCustom && (
                <input
                  type="number"
                  min={4}
                  max={256}
                  placeholder="Enter length (4–256)"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  autoFocus
                  className="default-radius w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
              )}
            </div>

            {/* Character sets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2.5">
                Character sets
              </label>
              <div className="flex flex-wrap gap-2">
                {CHAR_SETS.map((cs) => (
                  <button
                    key={cs.id}
                    type="button"
                    onClick={() => toggleSet(cs.id)}
                    className={[
                      "px-3 py-1.5 default-radius text-sm font-medium border transition-colors cursor-pointer",
                      enabledSets.has(cs.id)
                        ? "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    {cs.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Overview */}
            <div className="default-radius border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-bold text-gray-500 mb-3">Overview</p>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Source</p>
                  <p className="font-medium text-gray-800">{sourceData.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Length</p>
                  <p className="font-medium text-gray-800">
                    {activeLength > 0 ? (
                      `${activeLength} chars`
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Character Pool</p>
                  <p className="font-medium text-gray-800">
                    {charPool.length} chars
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Result */}
        {step === 3 && result && (
          <div className="animate-fade-in-up space-y-4">
            <div className="default-radius border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-500 mb-3">
                Configuration
              </p>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Entropy Source</p>
                  <p className="font-medium text-gray-800">{result.sourceName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Length</p>
                  <p className="font-medium text-gray-800">{result.length} chars</p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-700">
                  Generated Password
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 default-radius border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
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
                  {result.password}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-gray-100">
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
              className="flex items-center gap-1 default-radius border border-gray-200 px-4 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <MdArrowBack className="text-base" /> Back
            </button>
            <button
              type="button"
              disabled={!lengthValid}
              onClick={handleGenerate}
              style={{ backgroundColor: "var(--brand-primary)" }}
              className="default-radius px-4 py-2 text-sm font-medium text-white transition-opacity cursor-pointer hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Generate Password
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRegenerate}
                className="flex items-center gap-1.5 default-radius border border-gray-200 px-4 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <MdRefresh className="text-base" /> Regenerate
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="default-radius border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                New Password
              </button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
