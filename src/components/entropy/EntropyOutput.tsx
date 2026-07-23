"use client";

import type { ReactNode } from "react";
import CopyButton from "@/components/ui/CopyButton";
import type { EntropyResult } from "@/lib/entropy/generate";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-xs text-gray-400">{label}</p>
      <p className="break-all font-medium text-gray-800">{value}</p>
    </div>
  );
}

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

function formatIssuedAt(timestampUnixNs: number): string {
  if (!timestampUnixNs) return "—";
  return new Date(timestampUnixNs / 1_000_000).toLocaleString();
}

function ReceiptDetails({ result }: { result: EntropyResult }) {
  const r = result.receipt;
  return (
    <div className="default-radius border border-gray-100 bg-gray-50 p-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <Field label="Requested source" value={result.sourceName} />
        <Field label="Bytes" value={result.bytes} />
        <Field label="Output Format" value="Hexadecimal" />
        <Field label="Output Length" value={`${result.value.length} chars`} />

        <Field label="Policy" value={r.policy} />
        <Field label="Pool / tier" value={r.pool_id} />
        <Field label="Extractor" value={r.extractor_alg} />
        <Field label="DRBG" value={r.drbg_alg} />

        <Field label="Quality score" value={r.quality_score} />
        <Field
          label="Health gates"
          value={
            <span className="flex gap-2">
              <span>
                RCT <PassBadge pass={r.rct_pass} />
              </span>
              <span>
                APT <PassBadge pass={r.apt_pass} />
              </span>
            </span>
          }
        />
        <Field label="Input min-entropy" value={`${r.input_min_entropy_bits} bits`} />
        <Field
          label="Contributing sources"
          value={r.contributing_sources.length > 0 ? r.contributing_sources.join(", ") : "—"}
        />

        <Field label="Issued at" value={formatIssuedAt(r.timestamp_unix_ns)} />
        <Field label="Request ID" value={r.request_id} />
        <Field label="Audit event ID" value={r.audit_event_id} />
        {r.zone_id && <Field label="Zone" value={r.zone_id} />}
      </div>

      <div className="mt-3 border-t border-gray-100 pt-3">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs text-gray-400">Signature ({r.signature_alg})</p>
          <CopyButton value={r.signature} />
        </div>
        <p className="break-all font-mono text-xs text-gray-600">{r.signature}</p>
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
      <ReceiptDetails result={result} />
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
