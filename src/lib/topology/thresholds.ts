import type { EdgeEntry, Metric, QubitEntry } from "./client";
import { formatPct, formatSeconds } from "./format";

// Every quality threshold the topology views color or flag by lives here —
// change a number in this file, not in a component.

/**
 * LR-TECH-001 §3.3 "Default thresholds": a measured value below these is
 * DEGRADED (real, measured, poor) — distinct from SENTINEL (unmeasured).
 * §3 defines none for T1 or T2*, so those are null: no qubit is flagged on
 * them rather than flagged against a number nobody chose.
 *
 * singleQubitFidelity is applied to fRB (simultaneous) — the figure the map
 * shows, and the one workloads.yaml already resolved §7.2's bare "fRB" to.
 */
export const DEGRADED_THRESHOLDS = {
  singleQubitFidelity: 0.995,
  czFidelity: 0.98,
  readoutFidelity: 0.9,
  t1Seconds: null as number | null,
  t2StarSeconds: null as number | null,
} as const;

/**
 * CZ error (1 - fCZ) bands for coupler color: below `goodBelow` is good, up
 * to and including `warnUpTo` is a warning, above it is poor. `warnUpTo` is
 * the same line as DEGRADED_THRESHOLDS.czFidelity — a red coupler is
 * exactly a §3 DEGRADED one.
 */
export const CZ_ERROR_BANDS = {
  goodBelow: 0.01,
  warnUpTo: 0.02,
} as const;

export type CouplerBand = "good" | "warn" | "bad" | "uncalibrated";

// 1 - 0.98 is 0.020000000000000018 in floating point; rounding keeps a value
// sitting exactly on a threshold in the band the threshold names.
function roundError(error: number): number {
  return Math.round(error * 1e9) / 1e9;
}

/**
 * Sentinel or absent couplers (and any without a value) are
 * "uncalibrated" — never placed on the error scale. A degraded coupler
 * with a value is banded by that value like an active one.
 */
export function couplerBand(edge: EdgeEntry): CouplerBand {
  const { cz } = edge;
  if (edge.presence === "absent" || cz.state === "sentinel" || cz.state === "absent" || cz.value === null) {
    return "uncalibrated";
  }
  const error = roundError(1 - cz.value);
  if (error < CZ_ERROR_BANDS.goodBelow) return "good";
  if (error <= CZ_ERROR_BANDS.warnUpTo) return "warn";
  return "bad";
}

// ---------------------------------------------------------------------------
// Qubit map metrics
// ---------------------------------------------------------------------------

export type QubitMapMetricId = "frbSimultaneous" | "readoutError" | "t1" | "t2Star";

export interface QubitMapMetric {
  id: QubitMapMetricId;
  label: string;
  /** Which direction is good — drives gradient direction (good end is always the cyan end). */
  better: "higher" | "lower";
  /** The qubit's underlying Metric (value/error/state), untransformed. */
  source: (q: QubitEntry) => Metric;
  /** The number the map colors by and displays (e.g. readout error = 1 - fRO). null when not a number. */
  displayValue: (m: Metric) => number | null;
  format: (v: number | null) => string;
  /** null = no threshold defined for this metric. `label` is the legend text for the ring, e.g. "Below 99.5%". */
  threshold: { value: number; label: string } | null;
  /** On the source Metric's value — true when measured and below the §3 threshold. */
  belowThreshold: (m: Metric) => boolean;
}

const pct = (v: number) => `${+(v * 100).toFixed(2)}%`;

function measuredBelow(limit: number | null) {
  return (m: Metric) => limit !== null && m.value !== null && (m.state === "active" || m.state === "degraded") && m.value < limit;
}

export const QUBIT_MAP_METRICS: QubitMapMetric[] = [
  {
    id: "frbSimultaneous",
    // fRB measured with every qubit driven at once (crosstalk included).
    label: "1Q fidelity",
    better: "higher",
    source: (q) => q.frbSimultaneous,
    displayValue: (m) => m.value,
    format: (v) => formatPct(v),
    threshold: { value: DEGRADED_THRESHOLDS.singleQubitFidelity, label: `Below ${pct(DEGRADED_THRESHOLDS.singleQubitFidelity)}` },
    belowThreshold: measuredBelow(DEGRADED_THRESHOLDS.singleQubitFidelity),
  },
  {
    id: "readoutError",
    label: "Readout error",
    better: "lower",
    source: (q) => q.readout,
    displayValue: (m) => (m.value === null ? null : 1 - m.value),
    format: (v) => formatPct(v),
    // The limit is on readout fidelity (below 90%), shown as the error it means.
    threshold: { value: DEGRADED_THRESHOLDS.readoutFidelity, label: `Over ${pct(1 - DEGRADED_THRESHOLDS.readoutFidelity)}` },
    belowThreshold: measuredBelow(DEGRADED_THRESHOLDS.readoutFidelity),
  },
  {
    id: "t1",
    label: "T1",
    better: "higher",
    source: (q) => q.t1,
    displayValue: (m) => m.value,
    format: formatSeconds,
    threshold: null,
    belowThreshold: measuredBelow(DEGRADED_THRESHOLDS.t1Seconds),
  },
  {
    id: "t2Star",
    label: "T2*",
    better: "higher",
    source: (q) => q.t2,
    displayValue: (m) => m.value,
    format: formatSeconds,
    threshold: null,
    belowThreshold: measuredBelow(DEGRADED_THRESHOLDS.t2StarSeconds),
  },
];

/** A metric value the map can place on its gradient: measured (active or degraded), with a number, on a present qubit. */
export function colorableValue(q: QubitEntry, metric: QubitMapMetric): number | null {
  if (q.presence === "absent") return null;
  const m = metric.source(q);
  if (m.state !== "active" && m.state !== "degraded") return null;
  return metric.displayValue(m);
}

/** Flag shown on the map: measured below the §3 threshold, or marked degraded upstream. Never true for sentinel/absent. */
export function isDegraded(q: QubitEntry, metric: QubitMapMetric): boolean {
  if (q.presence === "absent") return false;
  const m = metric.source(q);
  return m.state === "degraded" || metric.belowThreshold(m);
}

// ---------------------------------------------------------------------------
// Measurement age
// ---------------------------------------------------------------------------

/**
 * A metric measured longer ago than this is shown faded/greyed. Mirrors
 * STALE_AFTER_SECONDS in light-rider-platform:
 * rigetti-proxy/topology/reader.py (1.5x the nominal ~24h calibration
 * cadence), which flags a whole snapshot stale — change both together.
 */
export const METRIC_STALE_AFTER_SECONDS = 36 * 3600;

/** What a metric's age is measured against: the snapshot's own source time and its server-computed age. */
export interface AgeReference {
  sourceTimestamp: string | null;
  snapshotAgeSeconds: number | null;
}

/**
 * Seconds since `measuredAt`, anchored on the server's snapshotAgeSeconds
 * rather than the browser clock (same reason TopologyExplorer uses the
 * server's secondsSinceLastSuccess): age = snapshot age + how much earlier
 * than the snapshot's source time this metric was measured. null when
 * either time is missing or unparseable.
 */
export function metricAgeSeconds(measuredAt: string | null, ref: AgeReference | null): number | null {
  if (!measuredAt || !ref?.sourceTimestamp || ref.snapshotAgeSeconds === null) return null;
  const measured = Date.parse(measuredAt);
  const source = Date.parse(ref.sourceTimestamp);
  if (Number.isNaN(measured) || Number.isNaN(source)) return null;
  return ref.snapshotAgeSeconds + (source - measured) / 1000;
}

export function isStaleAge(ageSeconds: number | null): boolean {
  return ageSeconds !== null && ageSeconds > METRIC_STALE_AFTER_SECONDS;
}
