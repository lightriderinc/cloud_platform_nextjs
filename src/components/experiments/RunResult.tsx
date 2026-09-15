"use client";

import type { AnalysisResult, PlacementWarning } from "./types";

function formatValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") return v.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return String(v);
}

/**
 * Renderer for one live-mode run's analyzed result -- headline metrics,
 * verdict, secondary detail, driven entirely by whatever the analyzer
 * returned. Always labeled "freshly measured" -- a pool withdrawal is a
 * different provenance and renders through WithdrawResultPanel instead,
 * never through this component.
 */
export default function RunResult({
  result,
  warnings,
  chipletId,
}: {
  result: AnalysisResult;
  warnings: PlacementWarning[];
  chipletId?: string;
}) {
  const deadlineWarnings = warnings.filter((w) => /deadline/i.test(w.title));
  const otherWarnings = warnings.filter((w) => !/deadline/i.test(w.title));

  return (
    <div className="default-radius border-2 border-blue-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
          Freshly measured — live hardware run{chipletId ? ` on ${chipletId}` : ""}
        </span>
      </div>

      {deadlineWarnings.map((w, i) => (
        <div key={i} className="mb-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
          <div className="font-medium">{w.title} — partial result</div>
          <div className="mt-1 text-blue-800">{w.body}</div>
        </div>
      ))}

      {result.headline.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {result.headline.map((m, i) => (
            <div key={i} className="default-radius border border-gray-100 p-3">
              <div className="text-xs text-gray-500">{m.label ?? m.name}</div>
              <div
                className={`mt-1 text-lg font-semibold ${m.accent ? "text-[var(--brand-primary)]" : "text-gray-900"}`}
              >
                {formatValue(m.value)}
                {typeof m.unit === "string" && <span className="ml-1 text-xs font-normal text-gray-400">{m.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verdict is shown in full, always -- this is where a run's claims
          boundary lives (e.g. "statistical tests do not establish quantum
          provenance"); it must never be truncated or hidden. */}
      <div className="mt-4 default-radius border border-gray-100 bg-gray-50 p-3 text-sm leading-relaxed text-gray-800">
        {result.verdict}
      </div>

      {otherWarnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {otherWarnings.map((w, i) => (
            <div key={i} className="rounded-md border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-medium">{w.title}</div>
              <div className="mt-1 text-amber-800">{w.body}</div>
            </div>
          ))}
        </div>
      )}

      {(Object.keys(result.secondary ?? {}).length > 0 || Object.keys(result.completion ?? {}).length > 0) && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer select-none text-gray-500 hover:text-gray-700">
            Secondary detail
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(result.secondary ?? {}).map(([k, v]) => (
              <div key={k}>
                <div className="text-xs text-gray-400">{k.replace(/_/g, " ")}</div>
                <div className="font-mono text-xs text-gray-700">
                  {typeof v === "object" ? JSON.stringify(v) : formatValue(v)}
                </div>
              </div>
            ))}
            {Object.entries(result.completion ?? {}).map(([k, v]) => (
              <div key={`completion-${k}`}>
                <div className="text-xs text-gray-400">{k.replace(/_/g, " ")}</div>
                <div className="font-mono text-xs text-gray-700">{formatValue(v)}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
