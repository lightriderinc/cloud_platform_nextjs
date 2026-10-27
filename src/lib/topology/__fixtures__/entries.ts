import type { EdgeEntry, Metric, MetricState, QubitEntry } from "../client";

// Test-only builders for already-normalized topology entries. Defaults are
// a healthy, fully measured qubit/coupler; each test overrides only what it
// is about.

export function metric(
  value: number | null,
  state: MetricState = "active",
  measuredAt: string | null = null,
  error: number | null = null,
): Metric {
  return { value, error, state, measuredAt };
}

export function qubit(qubitIndex: number, overrides: Partial<QubitEntry> = {}): QubitEntry {
  return {
    qubitIndex,
    presence: "active",
    chipletId: "C1",
    latticeRow: null,
    latticeCol: null,
    t1: metric(30e-6),
    t2: metric(10e-6),
    readout: metric(0.95),
    frbIsolated: metric(0.998),
    frbSimultaneous: metric(0.997),
    rxDurationNs: 40,
    hasCalibration: true,
    rawValues: {},
    ...overrides,
  };
}

export function edge(nodeA: number, nodeB: number, cz: Metric, overrides: Partial<EdgeEntry> = {}): EdgeEntry {
  return {
    nodeA,
    nodeB,
    presence: "active",
    cz,
    czDurationNs: 200,
    hasCalibration: true,
    chipletA: null,
    chipletB: null,
    isInterChiplet: null,
    corridorId: null,
    rawValues: {},
    ...overrides,
  };
}
