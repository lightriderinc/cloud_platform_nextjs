import type { EdgeEntry, Metric, QubitEntry } from "./client";
import { couplerBand } from "./thresholds";

// Per-chiplet summary, computed in the browser from the qubits/edges a view
// has already fetched — one helper for every view that summarizes a chiplet
// (the topology page's chiplet card, the Experiments chiplet picker).
//
// Same rules as everywhere else in the topology views: only a MEASURED value
// (active or degraded, with a number, on a present qubit) ever counts.
// Sentinel and absent are counted as such and never averaged in, never a
// minimum, never a "worst".

export interface QubitExtreme {
  qubitIndex: number;
  value: number;
  /** The qubit itself, so a view can link to its detail. */
  qubit: QubitEntry;
}

export interface MetricSummary {
  /** Mean over measured qubits only; null when none are measured. */
  mean: number | null;
  measuredCount: number;
  sentinelCount: number;
}

export interface CouplerCounts {
  total: number;
  /** Measured CZ (thresholds.ts couplerBand() is not "uncalibrated"). */
  calibrated: number;
}

export interface WorstCoupler {
  edge: EdgeEntry;
  czError: number;
}

export interface ChipletSummary {
  chipletId: string;
  qubitCount: number;
  absentQubits: number[];
  /** Both endpoints in this chiplet. */
  intraCouplers: CouplerCounts;
  /** Exactly one endpoint in this chiplet — this chiplet's side of its corridors. */
  boundaryCouplers: CouplerCounts;
  /** Highest CZ error among calibrated INTRA-chiplet couplers — the chiplet's own hardware. */
  worstCoupler: WorstCoupler | null;
  /** Highest CZ error among calibrated boundary couplers — reported separately, it belongs to a corridor. */
  worstBoundaryCoupler: WorstCoupler | null;
  /** Lowest readout fidelity. */
  worstReadout: QubitExtreme | null;
  lowestT1: QubitExtreme | null;
  lowestT2Star: QubitExtreme | null;
  frbSimultaneous: MetricSummary;
  /** Oldest / newest measuredAt across every measured metric on the chiplet's qubits and couplers (ISO); null when none recorded. */
  oldestMeasuredAt: string | null;
  newestMeasuredAt: string | null;
}

function measuredValue(q: QubitEntry, m: Metric): number | null {
  if (q.presence === "absent") return null;
  if (m.state !== "active" && m.state !== "degraded") return null;
  return m.value;
}

function lowest(qubits: QubitEntry[], pick: (q: QubitEntry) => Metric): QubitExtreme | null {
  let best: QubitExtreme | null = null;
  for (const q of qubits) {
    const v = measuredValue(q, pick(q));
    if (v !== null && (best === null || v < best.value)) best = { qubitIndex: q.qubitIndex, value: v, qubit: q };
  }
  return best;
}

function summarizeMetric(qubits: QubitEntry[], pick: (q: QubitEntry) => Metric): MetricSummary {
  const values: number[] = [];
  let sentinelCount = 0;
  for (const q of qubits) {
    if (q.presence !== "absent" && pick(q).state === "sentinel") sentinelCount++;
    const v = measuredValue(q, pick(q));
    if (v !== null) values.push(v);
  }
  return {
    mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    measuredCount: values.length,
    sentinelCount,
  };
}

/** Calibrated coupler with the highest CZ error; uncalibrated (sentinel/absent) never qualifies. */
function worstOf(edges: EdgeEntry[]): WorstCoupler | null {
  let worst: WorstCoupler | null = null;
  for (const e of edges) {
    if (couplerBand(e) === "uncalibrated") continue;
    const czError = 1 - (e.cz.value as number);
    if (worst === null || czError > worst.czError) worst = { edge: e, czError };
  }
  return worst;
}

function isMeasured(m: Metric): boolean {
  return (m.state === "active" || m.state === "degraded") && m.value !== null;
}

/**
 * Summaries for every chiplet that has at least one qubit, keyed by
 * chiplet id. Chiplet membership comes from each qubit's chipletId (so it
 * works without a descriptor); an edge belongs to a chiplet when either
 * endpoint does. Pass `edges = []` when only qubit figures are needed.
 */
export function summarizeChiplets(qubits: QubitEntry[], edges: EdgeEntry[]): Map<string, ChipletSummary> {
  const chipletOf = new Map<number, string>();
  const byChiplet = new Map<string, QubitEntry[]>();
  for (const q of qubits) {
    if (!q.chipletId) continue;
    chipletOf.set(q.qubitIndex, q.chipletId);
    const list = byChiplet.get(q.chipletId) ?? [];
    list.push(q);
    byChiplet.set(q.chipletId, list);
  }

  const out = new Map<string, ChipletSummary>();
  for (const [chipletId, members] of byChiplet) {
    const intra: EdgeEntry[] = [];
    const boundary: EdgeEntry[] = [];
    for (const e of edges) {
      const inA = chipletOf.get(e.nodeA) === chipletId;
      const inB = chipletOf.get(e.nodeB) === chipletId;
      if (inA && inB) intra.push(e);
      else if (inA || inB) boundary.push(e);
    }
    const counts = (list: EdgeEntry[]): CouplerCounts => ({
      total: list.length,
      calibrated: list.filter((e) => couplerBand(e) !== "uncalibrated").length,
    });


    const times: string[] = [];
    for (const q of members) {
      if (q.presence === "absent") continue;
      for (const m of [q.t1, q.t2, q.readout, q.frbIsolated, q.frbSimultaneous]) {
        if (isMeasured(m) && m.measuredAt) times.push(m.measuredAt);
      }
    }
    for (const e of [...intra, ...boundary]) {
      if (isMeasured(e.cz) && e.cz.measuredAt) times.push(e.cz.measuredAt);
    }
    const stamped = times
      .map((t) => ({ t, ms: Date.parse(t) }))
      .filter((x) => !Number.isNaN(x.ms))
      .sort((a, b) => a.ms - b.ms);

    out.set(chipletId, {
      chipletId,
      qubitCount: members.length,
      absentQubits: members.filter((q) => q.presence === "absent").map((q) => q.qubitIndex),
      intraCouplers: counts(intra),
      boundaryCouplers: counts(boundary),
      worstCoupler: worstOf(intra),
      worstBoundaryCoupler: worstOf(boundary),
      worstReadout: lowest(members, (q) => q.readout),
      lowestT1: lowest(members, (q) => q.t1),
      lowestT2Star: lowest(members, (q) => q.t2),
      frbSimultaneous: summarizeMetric(members, (q) => q.frbSimultaneous),
      oldestMeasuredAt: stamped.length ? stamped[0].t : null,
      newestMeasuredAt: stamped.length ? stamped[stamped.length - 1].t : null,
    });
  }
  return out;
}
