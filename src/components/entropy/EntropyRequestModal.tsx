"use client";

import { useState } from "react";
import { MdClose, MdExpandLess, MdExpandMore } from "react-icons/md";
import EntropySourceSelector, {
  SOURCES,
} from "@/components/applications/EntropySourceSelector";
import LRButton from "@/components/ui/LRButton";
import PresetSelector from "@/components/ui/PresetSelector";
import CopyButton from "@/components/ui/CopyButton";
import {
  BYTE_PRESETS,
  MAX_BYTES,
  MIN_BYTES,
  isValidByteCount,
  requestEntropy,
  type EntropyResult,
} from "@/lib/entropy/generate";

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
 * Dashboard-tile entry point for real entropy generation — reuses the exact
 * same source selector and requestEntropy() call as the full /entropy page
 * (src/app/entropy/page.tsx), just in a compact modal shell instead of a
 * page, matching BackendSubmitModal's form -> result -> reset pattern (no
 * session history list here, unlike the full page's EntropyConsole).
 */
export default function EntropyRequestModal({ onClose }: { onClose: () => void }) {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [bytes, setBytes] = useState<number>(32);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<EntropyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const sourceData = SOURCES.find((s) => s.id === selectedSourceId);
  const bytesValid = isValidByteCount(bytes);
  const canGenerate = !!sourceData && bytesValid && !generating;

  async function handleGenerate() {
    if (!sourceData || !bytesValid) return;
    setGenerating(true);
    setError(null);
    try {
      const next = await requestEntropy({
        sourceId: sourceData.id,
        sourceName: sourceData.name,
        bytes,
      });
      setResult(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entropy request failed.");
    } finally {
      setGenerating(false);
    }
  }

  function handleGenerateAnother() {
    setResult(null);
    setError(null);
    setShowDetails(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Get Entropy"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-xl flex-col default-radius bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-8 pb-5 pt-8 pr-16">
          <h2 className="text-lg font-semibold">
            {result ? "Entropy Result" : "Get Entropy"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg text-gray-500 hover:text-gray-700"
          >
            <MdClose />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-8 pb-8">
          {result ? (
            <div className="space-y-4">
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
                  <p className="text-sm font-bold text-gray-700">Entropy Output (hex)</p>
                  <CopyButton value={result.value} />
                </div>
                <div className="default-radius border border-gray-800 bg-gray-800 p-4 overflow-x-auto">
                  <p className="font-mono text-xs text-green-300 break-all leading-relaxed">
                    {result.value}
                  </p>
                </div>
              </div>

              {/* Behind "Show details": policy, extractor, DRBG, min-entropy,
                  contributing sources, issued at, audit event id, zone, and
                  the full signature. */}
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
                      <Field label="Issued at" value={formatIssuedAt(result.receipt.timestamp_unix_ns)} />
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
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="mb-2.5 block text-sm font-medium text-gray-700">
                  Entropy source
                </label>
                <EntropySourceSelector
                  selectedId={selectedSourceId}
                  onSelect={setSelectedSourceId}
                />
              </div>

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

              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-gray-100 px-8 py-4">
          {result ? (
            <>
              <div />
              <LRButton type="button" onClick={handleGenerateAnother} variant="secondary-outline">
                Generate Another
              </LRButton>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="default-radius cursor-pointer border border-gray-100 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <LRButton
                type="button"
                disabled={!canGenerate}
                onClick={handleGenerate}
                variant="primary"
              >
                {generating ? "Generating…" : "Generate Entropy"}
              </LRButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
