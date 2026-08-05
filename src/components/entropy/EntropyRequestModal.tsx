"use client";

import { useState } from "react";
import {
  MdArrowBack,
  MdArrowForward,
  MdExpandLess,
  MdExpandMore,
  MdRefresh,
} from "react-icons/md";
import EntropySourceSelector, {
  SOURCES,
} from "@/components/applications/EntropySourceSelector";
import ModalShell from "@/components/applications/ModalShell";
import StepIndicator from "@/components/applications/StepIndicator";
import CopyButton from "@/components/ui/CopyButton";
import LRButton from "@/components/ui/LRButton";
import PresetSelector from "@/components/ui/PresetSelector";
import {
  BYTE_PRESETS,
  MAX_BYTES,
  MIN_BYTES,
  isValidByteCount,
  requestEntropy,
  type EntropyResult,
} from "@/lib/entropy/generate";

const STEPS = ["Source", "Bytes", "Result"];

type Step = 1 | 2 | 3;

function PassBadge({ pass }: { pass: boolean }) {
  return (
    <span
      className={[
        "inline-block default-radius px-1.5 py-0.5 text-xs font-medium",
        pass ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700",
      ].join(" ")}
    >
      {pass ? "Pass" : "Fail"}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-xs text-gray-400">{label}</p>
      <p className="break-all font-medium text-gray-800">{value}</p>
    </div>
  );
}

function formatIssuedAt(timestampUnixNs: number): string {
  if (!timestampUnixNs) return "—";
  return new Date(timestampUnixNs / 1_000_000).toLocaleString();
}

/**
 * Dashboard-tile entry point for real entropy generation. Mirrors
 * DiceRollModal's stepped flow (Source → Bytes → Result) built on the shared
 * ModalShell + StepIndicator, and reuses the exact same source selector and
 * requestEntropy() call as the full /entropy page (src/app/entropy/page.tsx).
 */
export default function EntropyRequestModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>(1);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [bytes, setBytes] = useState<number>(32);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<EntropyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const sourceData = SOURCES.find((s) => s.id === selectedSourceId);
  const bytesValid = isValidByteCount(bytes);

  // Generate entropy for the current source + byte count. `advanceToResult`
  // moves to step 3 on success (used from the Bytes step); "Generate Again" on
  // the result step leaves it false so we stay put with a fresh result.
  async function generate(advanceToResult: boolean) {
    if (!sourceData || !bytesValid || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const next = await requestEntropy({
        sourceId: sourceData.id,
        sourceName: sourceData.name,
        bytes,
      });
      setResult(next);
      setShowDetails(false);
      if (advanceToResult) setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entropy request failed.");
    } finally {
      setGenerating(false);
    }
  }

  function handleNewRequest() {
    setStep(1);
    setResult(null);
    setError(null);
    setShowDetails(false);
  }

  return (
    <ModalShell title="Get Entropy" onClose={onClose}>
      <StepIndicator steps={STEPS} current={step} />

      <div className="max-h-[60vh] min-h-[300px] overflow-y-auto py-5">
        {/* Step 1 — Source selection */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <p className="mb-4 text-sm">Choose an entropy source.</p>
            <EntropySourceSelector
              selectedId={selectedSourceId}
              onSelect={setSelectedSourceId}
            />
          </div>
        )}

        {/* Step 2 — Byte count */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs text-gray-500">Source:</span>
              <span className="inline-flex items-center default-radius border border-[var(--brand-primary)]/25 bg-red-50 px-2.5 py-1 text-xs font-medium text-[var(--brand-primary)]">
                {sourceData?.name}
              </span>
            </div>
            {sourceData?.description && (
              <p className="mb-5 text-xs leading-snug text-gray-500">
                {sourceData.description}
              </p>
            )}

            <PresetSelector
              label="Number of entropy bytes"
              presets={BYTE_PRESETS}
              value={bytes}
              onChange={setBytes}
              min={MIN_BYTES}
              max={MAX_BYTES}
              formatPreset={(n) => `${n}B`}
              customPlaceholder={`Enter bytes (${MIN_BYTES}–${MAX_BYTES})`}
            />

            <p className="mt-3 text-xs leading-snug text-gray-400">
              Output is returned as a {MIN_BYTES}–{MAX_BYTES} byte hex string with
              a signed quality receipt.
            </p>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          </div>
        )}

        {/* Step 3 — Result */}
        {step === 3 && result && (
          <div className="animate-fade-in-up space-y-4">
            {/* Always-visible: source/bytes, output, quality score + health
                gates + pool/tier, request id. */}
            <div className="default-radius border border-gray-100 bg-gray-50 p-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Field label="Source" value={result.sourceName} />
                <Field label="Bytes" value={result.bytes} />
                <Field label="Quality score" value={result.receipt.quality_score} />
                <Field
                  label="Health gates"
                  value={
                    <span className="flex gap-2">
                      <span>
                        RCT <PassBadge pass={result.receipt.rct_pass} />
                      </span>
                      <span>
                        APT <PassBadge pass={result.receipt.apt_pass} />
                      </span>
                    </span>
                  }
                />
                <Field label="Pool / tier" value={result.receipt.pool_id} />
                <Field label="Request ID" value={result.receipt.request_id} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-700">
                  Entropy Output (hex)
                </p>
                <CopyButton value={result.value} />
              </div>
              <div className="default-radius overflow-x-auto border border-gray-800 bg-gray-800 p-4">
                <p className="break-all font-mono text-xs leading-relaxed text-green-300">
                  {result.value}
                </p>
              </div>
            </div>

            {/* Behind "Show details": policy, extractor, DRBG, min-entropy,
                contributing sources, issued at, audit event id, zone, and the
                full signature. */}
            <div>
              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="flex cursor-pointer items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                {showDetails ? <MdExpandLess /> : <MdExpandMore />}
                {showDetails ? "Hide details" : "Show details"}
              </button>

              {showDetails && (
                <div className="mt-3 default-radius border border-gray-100 bg-gray-50 p-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <Field label="Policy" value={result.receipt.policy} />
                    <Field label="Extractor" value={result.receipt.extractor_alg} />
                    <Field label="DRBG" value={result.receipt.drbg_alg} />
                    <Field
                      label="Input min-entropy"
                      value={`${result.receipt.input_min_entropy_bits} bits`}
                    />
                    <Field
                      label="Contributing sources"
                      value={
                        result.receipt.contributing_sources.length > 0
                          ? result.receipt.contributing_sources.join(", ")
                          : "—"
                      }
                    />
                    <Field
                      label="Issued at"
                      value={formatIssuedAt(result.receipt.timestamp_unix_ns)}
                    />
                    <Field label="Audit event ID" value={result.receipt.audit_event_id} />
                    {result.receipt.zone_id && (
                      <Field label="Zone" value={result.receipt.zone_id} />
                    )}
                  </div>

                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        Signature ({result.receipt.signature_alg})
                      </p>
                      <CopyButton value={result.receipt.signature} />
                    </div>
                    <p className="break-all font-mono text-xs text-gray-600">
                      {result.receipt.signature}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-gray-100 pt-4">
        {step === 1 && (
          <>
            <LRButton
              type="button"
              variant="secondary-outline"
              onClick={onClose}
            >
              Cancel
            </LRButton>
            <LRButton
              type="button"
              variant="primary"
              disabled={!sourceData}
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
              disabled={!bytesValid || generating}
              onClick={() => generate(true)}
            >
              {generating ? "Generating…" : "Generate Entropy"}
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
                disabled={generating}
                onClick={() => generate(false)}
                icon={<MdRefresh />}
                iconPosition="left"
              >
                {generating ? "Generating…" : "Generate Again"}
              </LRButton>
              <LRButton
                type="button"
                variant="secondary-outline"
                disabled={generating}
                onClick={handleNewRequest}
              >
                New Request
              </LRButton>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
