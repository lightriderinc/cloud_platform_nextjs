"use client";

import { useState } from "react";
import { MdArrowForward } from "react-icons/md";
import EntropySourceSelector, {
  SOURCES,
} from "@/components/applications/EntropySourceSelector";
import PresetSelector from "@/components/ui/PresetSelector";
import {
  BYTE_PRESETS,
  MAX_BYTES,
  MIN_BYTES,
  isValidByteCount,
  requestEntropy,
  type EntropyResult,
} from "@/lib/entropy/generate";
import EntropyHistory from "./EntropyHistory";
import EntropyOutput from "./EntropyOutput";

const HISTORY_LIMIT = 20;

/**
 * Single-screen entropy console: configure a request on the left, see the live
 * result on the right, and re-copy earlier results from the session history.
 */
export default function EntropyConsole() {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [bytes, setBytes] = useState<number>(32);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<EntropyResult | null>(null);
  const [history, setHistory] = useState<EntropyResult[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      setHistory((prev) => [next, ...prev].slice(0, HISTORY_LIMIT));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entropy request failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Configure */}
        <section className="flex flex-col gap-5 default-radius border border-gray-100 bg-gray-100 p-5">
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

          {!bytesValid && (
            <p className="text-xs text-[var(--brand-primary)]">
              Enter a byte count between {MIN_BYTES} and {MAX_BYTES}.
            </p>
          )}

          {error && (
            <p className="text-xs text-[var(--brand-primary)]">{error}</p>
          )}

          <button
            type="button"
            disabled={!canGenerate}
            onClick={handleGenerate}
            style={{ backgroundColor: "var(--brand-primary)" }}
            className="mt-auto flex items-center justify-center default-radius px-4 py-2.5 text-sm font-medium text-white transition-opacity cursor-pointer hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating ? (
              "Generating…"
            ) : (
              <>
                Generate entropy
                <MdArrowForward className="ml-1 inline-block text-lg" />
              </>
            )}
          </button>
        </section>

        {/* Output */}
        <section className="flex flex-col default-radius border border-gray-100 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-gray-600">Output</h2>
          <div className="flex-1">
            <EntropyOutput result={result} />
          </div>
        </section>
      </div>

      <EntropyHistory
        items={history}
        onSelect={setResult}
        onClear={() => setHistory([])}
      />
    </div>
  );
}
