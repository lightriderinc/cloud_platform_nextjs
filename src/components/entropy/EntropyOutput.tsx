"use client";

import CopyButton from "@/components/ui/CopyButton";
import type { EntropyResult } from "@/lib/entropy/generate";

function MetaGrid({ result }: { result: EntropyResult }) {
  return (
    <div className="default-radius border border-gray-100 bg-gray-50 p-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <p className="mb-0.5 text-xs text-gray-400">Source</p>
          <p className="font-medium text-gray-800">{result.sourceName}</p>
        </div>
        <div>
          <p className="mb-0.5 text-xs text-gray-400">Bytes</p>
          <p className="font-medium text-gray-800">{result.bytes}</p>
        </div>
        <div>
          <p className="mb-0.5 text-xs text-gray-400">Output Format</p>
          <p className="font-medium text-gray-800">Hexadecimal</p>
        </div>
        <div>
          <p className="mb-0.5 text-xs text-gray-400">Output Length</p>
          <p className="font-medium text-gray-800">{result.value.length} chars</p>
        </div>
      </div>
    </div>
  );
}

/** Renders the latest entropy result, or an empty state before first generate. */
export default function EntropyOutput({
  result,
}: {
  result: EntropyResult | null;
}) {
  if (!result) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 default-radius border border-dashed border-gray-200 p-8 text-center">
        <p className="text-sm font-medium text-gray-500">
          No entropy generated yet
        </p>
        <p className="text-xs text-gray-400">
          Pick a source and byte length, then generate to see your output here.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <MetaGrid result={result} />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-700">Entropy Output</p>
          <CopyButton value={result.value} />
        </div>
        <div className="default-radius overflow-x-auto border border-gray-800 bg-gray-800 p-4">
          <p className="break-all font-mono text-xs leading-relaxed text-green-300">
            {result.value}
          </p>
        </div>
      </div>
    </div>
  );
}
