import type { Metric, MetricState } from "./client";

// Every user-facing number and state on the topology view goes through
// here, so wording and precision can't drift per component.
//
// Precision, per kind of number: percentages 2 decimals, T1/T2* 1 decimal
// in µs, gate times whole ns. Anything unmeasured reads "Not measured",
// never 0 and never blank (blank reads as low).

export const NOT_MEASURED = "Not measured";

/** A fraction (fidelity, error rate, score) as a percentage. */
export function formatPct(value: number | null, digits = 2): string {
  if (value === null) return NOT_MEASURED;
  return `${(value * 100).toFixed(digits)}%`;
}

/** Kept under its old name for callers outside the topology view. */
export const formatFidelityPct = formatPct;

/** "± 0.03%". An error bar too small to show at 2 decimals reads "± <0.01%", not "± 0.00%". */
export function formatPctErrorBar(error: number): string {
  return error * 100 < 0.005 ? "± <0.01%" : `± ${(error * 100).toFixed(2)}%`;
}

export function formatSeconds(value: number | null): string {
  if (value === null) return NOT_MEASURED;
  if (value < 1e-3) return `${(value * 1e6).toFixed(1)} µs`;
  return `${(value * 1e3).toFixed(1)} ms`;
}

/** "± 3.7 µs". An error bar too small to show at 1 decimal reads "± <0.1 µs", not "± 0.0 µs". */
export function formatSecondsErrorBar(error: number): string {
  return error < 1e-3 && error * 1e6 < 0.05 ? "± <0.1 µs" : `± ${formatSeconds(error)}`;
}

export function formatDurationNs(value: number | null): string {
  if (value === null) return NOT_MEASURED;
  return `${+value.toFixed(1)} ns`;
}

/** Badge text for a metric's state. "Measured" says the value is real; the threshold ring, not the badge, says whether it's good. */
export function stateLabel(state: MetricState): string {
  switch (state) {
    case "active":
      return "Measured";
    case "degraded":
      return "Below threshold";
    case "sentinel":
      return NOT_MEASURED;
    case "absent":
      return "Absent";
  }
}

/** A state-aware value string: never shows the vendor's 0.5 placeholder for an unmeasured value. */
export function formatMetricValue(m: Metric, formatter: (v: number | null) => string): string {
  if (m.state === "sentinel") return NOT_MEASURED;
  if (m.state === "absent") return "Absent";
  return formatter(m.value);
}

/** "32 minutes ago", "1 hour ago". */
export function formatAgo(seconds: number): string {
  return `${formatDuration(seconds)} ago`;
}

/** "Next check in 3 hours". */
export function formatNextCheck(seconds: number): string {
  return `Next check in ${formatDuration(seconds)}`;
}

/** "484423c6": the calibration ID shortened for display, not for lookups. */
export function formatCalibrationShort(calibrationId: string): string {
  return calibrationId.replace(/^sha256:/, "").slice(0, 8);
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** "12 minutes", "5 hours", "2 days". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, seconds);
  if (s < 3600) return plural(Math.floor(s / 60), "minute");
  if (s < 48 * 3600) return plural(Math.floor(s / 3600), "hour");
  return plural(Math.floor(s / 86400), "day");
}

/** "Measured 5 hours ago". A missing time reads as not recorded, never as "just now". */
export function formatMeasuredAge(seconds: number | null): string {
  if (seconds === null) return "Measurement time not recorded";
  return `Measured ${formatDuration(seconds)} ago`;
}

/** "36 hours": a limit, written the way people say it. */
export function formatHours(seconds: number): string {
  return plural(+(seconds / 3600).toFixed(1), "hour");
}
