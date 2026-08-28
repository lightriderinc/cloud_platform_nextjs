import type { Metric, MetricState, TopologyProvenance } from "./client";

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

/** "inferred" stays as-is; "vendor_confirmed" reads as "Confirmed" in the top strip. Historical snapshots (descriptor 1.0.0) still resolve to "inferred". */
export function formatProvenance(provenance: TopologyProvenance): string {
  return provenance === "vendor_confirmed" ? "Confirmed" : provenance;
}

/** A short, state-aware value string for a Metric — never shows a sentinel's underlying 0.5/1.0 placeholder as if it were the value. */
export function formatMetricValue(m: Metric, formatter: (v: number | null) => string): string {
  if (m.state === "sentinel") return "uncharacterized";
  if (m.state === "absent") return "—";
  return formatter(m.value);
}

function hoursAndMinutes(seconds: number): { hours: number; minutes: number } {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return { hours, minutes };
}

/** "4h 36m old" — calibration age (source_timestamp), the vendor's data, not ours. */
export function formatAgeShort(seconds: number): string {
  const { hours, minutes } = hoursAndMinutes(seconds);
  if (hours === 0) return `${minutes}m old`;
  return `${hours}h ${minutes}m old`;
}

/** "32m ago" — our own poller's last successful fetch. Distinct from formatAgeShort: same math, different subject and phrasing, so the two are never visually confusable. */
export function formatAgoShort(seconds: number): string {
  const { hours, minutes } = hoursAndMinutes(seconds);
  if (hours === 0) return `${minutes}m ago`;
  return `${hours}h ${minutes}m ago`;
}

/** "next in 3h 28m" — time remaining until the poller's next scheduled run. */
export function formatEtaShort(seconds: number): string {
  const { hours, minutes } = hoursAndMinutes(Math.max(0, seconds));
  if (hours === 0) return `next in ${minutes}m`;
  return `next in ${hours}h ${minutes}m`;
}

/** "484423c6" — calibration_id truncated to a short, still-distinguishing form for display alongside the age, not for lookups. */
export function formatCalibrationShort(calibrationId: string): string {
  return calibrationId.replace(/^sha256:/, "").slice(0, 8);
}
