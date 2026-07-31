"use client";

import { useState } from "react";
import { MdBolt, MdCheckCircle, MdWarning, MdScience, MdOpenInNew } from "react-icons/md";
import ModalShell from "./ModalShell";

interface EntropyResponse {
  bytesHex: string;
  nist: {
    live: boolean;
    reachable: boolean;
    pulseUri: string | null;
    pulseTimestamp: string | null;
    pulseAgeSeconds: number | null;
    note: string;
  };
  curby: {
    reachable: boolean;
    note: string;
  };
  health: {
    bitBalance: { onesPercent: number; pass: boolean };
    chiSquare: { value: number; pass: boolean };
    longestRun: { bits: number; pass: boolean };
    overallPass: boolean;
  };
}

export default function CurbyEntropyModal({ onClose }: { onClose: () => void }) {
  const [result, setResult] = useState<EntropyResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/entropy/curby", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fetch failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch entropy");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Fetch Quantum Entropy — NIST Randomness Beacon + CURBy" onClose={onClose}>
      <div className="py-4 min-h-[300px]">
        <p className="text-sm text-gray-600 mb-4">
          Real randomness from NIST&apos;s government beacon, cross-checked with CURBy.
        </p>

        <button
          type="button"
          onClick={handleFetch}
          disabled={busy}
          style={{ backgroundColor: "var(--brand-primary)" }}
          className="flex items-center gap-1.5 default-radius px-4 py-2 text-sm font-medium text-white hover:opacity-80 cursor-pointer disabled:opacity-40 mb-4"
        >
          <MdBolt /> {busy ? "Fetching (takes ~2s)…" : "Fetch Quantum Entropy"}
        </button>

        {error && (
          <p className="text-sm text-red-600 default-radius bg-red-50 border border-red-100 px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {result && (
          <>
            {/* NIST — shown first */}
            <div
              className={`default-radius border p-4 mb-3 flex items-start gap-3 ${
                result.nist.live ? "border-green-100 bg-green-50" : "border-amber-100 bg-amber-50"
              }`}
            >
              {result.nist.live ? (
                <MdCheckCircle className="text-green-700 text-xl mt-0.5 shrink-0" />
              ) : (
                <MdWarning className="text-amber-700 text-xl mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-semibold ${result.nist.live ? "text-green-800" : "text-amber-800"}`}>
                  NIST Randomness Beacon —{" "}
                  {result.nist.reachable ? (result.nist.live ? "pulse is current" : "pulse looks stale") : "unreachable"}
                </p>
                <p className={`text-xs mt-0.5 ${result.nist.live ? "text-green-700" : "text-amber-700"}`}>
                  {result.nist.note}
                </p>
                {result.nist.pulseTimestamp && (
                  <p className="text-xs text-gray-500 mt-1">
                    Pulse time: {new Date(result.nist.pulseTimestamp).toLocaleString()}
                    {result.nist.pulseAgeSeconds !== null && ` (${result.nist.pulseAgeSeconds}s ago)`}
                  </p>
                )}
                {result.nist.pulseUri && (
                  <a
                    href={result.nist.pulseUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                  >
                    Verify this exact pulse on beacon.nist.gov <MdOpenInNew />
                  </a>
                )}
              </div>
            </div>

            {/* CURBy — shown second */}
            <div
              className={`default-radius border p-3 mb-4 flex items-start gap-3 ${
                result.curby.reachable ? "border-green-100 bg-green-50" : "border-amber-100 bg-amber-50"
              }`}
            >
              {result.curby.reachable ? (
                <MdCheckCircle className="text-green-700 text-lg mt-0.5 shrink-0" />
              ) : (
                <MdWarning className="text-amber-700 text-lg mt-0.5 shrink-0" />
              )}
              <div>
                <p className={`text-xs font-semibold ${result.curby.reachable ? "text-green-800" : "text-amber-800"}`}>
                  CURBy (NIST / CU Boulder) — {result.curby.reachable ? "reachable" : "unreachable"}
                </p>
                <p className={`text-xs mt-0.5 ${result.curby.reachable ? "text-green-700" : "text-amber-700"}`}>
                  {result.curby.note}
                </p>
              </div>
            </div>

            <div className="default-radius border border-gray-100 bg-gray-50 p-3 mb-4">
              <p className="text-xs text-gray-500 mb-1">Combined final entropy (hex, truncated)</p>
              <p className="font-mono text-xs text-gray-700 break-all">{result.bytesHex.slice(0, 48)}…</p>
            </div>

            <div className="default-radius border border-gray-100 p-4 mb-4">
              <div className="flex items-center gap-1.5 mb-3">
                <MdScience className="text-gray-500" />
                <p className="text-sm font-bold text-gray-700">Statistical health check</p>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Basic sanity checks, not a full certification.
              </p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-gray-800">{result.health.bitBalance.onesPercent}%</p>
                  <p className="text-xs text-gray-500 mb-1">bits set to 1</p>
                  <span className={result.health.bitBalance.pass ? "text-green-600 text-xs" : "text-red-600 text-xs"}>
                    {result.health.bitBalance.pass ? "✓ balanced" : "✗ skewed"}
                  </span>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-800">{result.health.chiSquare.value}</p>
                  <p className="text-xs text-gray-500 mb-1">chi-square</p>
                  <span className="text-gray-400 text-xs">reference only</span>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-800">{result.health.longestRun.bits}</p>
                  <p className="text-xs text-gray-500 mb-1">longest run (bits)</p>
                  <span className={result.health.longestRun.pass ? "text-green-600 text-xs" : "text-red-600 text-xs"}>
                    {result.health.longestRun.pass ? "✓ normal" : "✗ suspicious"}
                  </span>
                </div>
              </div>
            </div>

            <div className="default-radius border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs text-gray-400 text-center">
              Never used as a secret key alone — always mixed with local randomness first.
              </p>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}