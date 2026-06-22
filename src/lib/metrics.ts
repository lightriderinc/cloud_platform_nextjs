// Shared numeric helpers for turning raw per-qubit/per-gate calibration
// values into the single figures shown on a card. Used by every provider
// mapper (IQM, Rigetti, ...).

export function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Fraction (0-1) to a percent rounded to 2 dp, e.g. 0.9985 -> 99.85. */
export function asPercent(fraction: number | undefined): number | undefined {
  return fraction === undefined ? undefined : Number((fraction * 100).toFixed(2));
}

/** Seconds to microseconds rounded to 1 dp, e.g. 3.95e-5 -> 39.5. */
export function asMicroseconds(seconds: number | undefined): number | undefined {
  return seconds === undefined ? undefined : Number((seconds * 1e6).toFixed(1));
}
