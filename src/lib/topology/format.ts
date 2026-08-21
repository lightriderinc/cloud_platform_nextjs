import type { Metric, MetricState } from "./client";

// Centralized so every view (map, ranking, detail) renders null/state the
// same way — the whole point of the display rules is that these can't drift
// per-component.

/** A null fidelity/score renders as "not measured", never 0, never blank (which reads as low). */
export function formatFidelityPct(value: number | null, digits = 3): string {
  if (value === null) return "not measured";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatScore(value: number | null, digits = 4): string {
  if (value === null) return "not measured";
  return value.toFixed(digits);
}

export function formatSeconds(value: number | null): string {
  if (value === null) return "not measured";
  if (value < 1e-3) return `${(value * 1e6).toFixed(2)} µs`;
  return `${(value * 1e3).toFixed(2)} ms`;
}

export function formatDurationNs(value: number | null): string {
  if (value === null) return "not measured";
  return `${value.toFixed(1)} ns`;
}

export function stateLabel(state: MetricState): string {
  switch (state) {
    case "active":
      return "Active";
    case "degraded":
      return "Degraded";
    case "sentinel":
      return "Sentinel";
    case "absent":
      return "Absent";
  }
}

/** A short, state-aware value string for a Metric — never shows a sentinel's underlying 0.5/1.0 placeholder as if it were the value. */
export function formatMetricValue(m: Metric, formatter: (v: number | null) => string): string {
  if (m.state === "sentinel") return "uncharacterized";
  if (m.state === "absent") return "—";
  return formatter(m.value);
}
