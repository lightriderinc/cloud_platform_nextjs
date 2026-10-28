import { vi } from "vitest";
import { fetchEdges, fetchQubits } from "../client";

// A small synthetic snapshot in qpu-proxy's WIRE format (snake_case), shaped
// like Cepheus but 3 chiplets instead of 12: a 9x3 row-major lattice cut into
// 3x3 chiplets C1 | C2 | C3 (lattice columns 0-2 | 3-5 | 6-8),
// nearest-neighbour couplers.
//
// Deliberate cases:
//   - q8 absent (C3) — so its two couplers 7-8 / 8-17 are not in the ISA
//   - fRB (simultaneous + isolated) sentinel on q4, q13 (C2)
//   - readout sentinel on q16 (C3)
//   - sentinel couplers: 0-1 (C1 intra), 14-15 (C2-C3 boundary), 24-25 (C3 intra)
//   - worst intra coupler 3-4 (C2, 2.5% error), worst boundary 2-3 (C1-C2, 5%)
//   - readout below the §3 threshold on q25 (C3); fRB below threshold on q19 (C1)
//   - per-metric times: q10's T1 measured 51h before the source time (stale)
//
// All values are fixed (no randomness), so expectations can be exact.

export const LATTICE = { width: 9, height: 3, chiplet_size: 3, chiplet_array_cols: 3, chiplet_array_rows: 1 };
export const CALIBRATION_ID = "5ca1ab1e".repeat(8);
export const SOURCE_TIMESTAMP = "2026-10-27T15:00:00+00:00";
export const SNAPSHOT_AGE_SECONDS = 3 * 3600;
const FRESH = "2026-10-27T14:00:00+00:00";
const STALE = "2026-10-25T12:00:00+00:00";

export const ABSENT = [8];
export const FRB_SENTINEL = [4, 13];
export const READOUT_SENTINEL = [16];
export const SENTINEL_COUPLERS = ["0-1", "14-15", "24-25"];

type State = "active" | "sentinel" | "absent";

export interface WireQubit {
  qubit_index: number;
  presence: State;
  chiplet_id: string;
  lattice_row?: number;
  lattice_col?: number;
  t1_seconds: number | null;
  t1_error: number | null;
  t1_state: State;
  t2_seconds: number | null;
  t2_error: number | null;
  t2_state: State;
  readout_fidelity: number | null;
  readout_error: null;
  readout_state: State;
  frb_isolated: number | null;
  frb_isolated_error: number | null;
  frb_isolated_state: State;
  frb_simultaneous: number | null;
  frb_simultaneous_error: number | null;
  frb_simultaneous_state: State;
  rx_duration_ns: number | null;
  has_calibration: boolean;
  raw_values: Record<string, unknown>;
  t1_measured_at?: string | null;
  t2_measured_at?: string | null;
  readout_measured_at?: string | null;
  frb_isolated_measured_at?: string | null;
  frb_simultaneous_measured_at?: string | null;
}

export interface WireEdge {
  node_a: number;
  node_b: number;
  presence: "active";
  cz_fidelity: number | null;
  cz_error: number | null;
  cz_state: State;
  cz_duration_ns: number;
  has_calibration: boolean;
  chiplet_a: string;
  chiplet_b: string;
  is_inter_chiplet: boolean;
  corridor_id: string | null;
  raw_values: Record<string, unknown>;
  cz_measured_at?: string | null;
}

const chipletOf = (q: number) => `C${Math.floor((q % LATTICE.width) / LATTICE.chiplet_size) + 1}`;

function wireQubit(q: number, withLattice: boolean, withTimes: boolean): WireQubit {
  const absent = ABSENT.includes(q);
  const st = (sentinel: boolean): State => (absent ? "absent" : sentinel ? "sentinel" : "active");
  const val = (s: State, v: number) => (s === "active" ? v : null);
  const frbState = st(FRB_SENTINEL.includes(q));
  const roState = st(READOUT_SENTINEL.includes(q));
  const t = (s: State, at: string = FRESH) => (withTimes && s === "active" ? at : null);
  const row: WireQubit = {
    qubit_index: q,
    presence: absent ? "absent" : "active",
    chiplet_id: chipletOf(q),
    t1_seconds: val(st(false), (20 + ((q * 7) % 40)) * 1e-6),
    t1_error: val(st(false), 1.5e-6),
    t1_state: st(false),
    t2_seconds: val(st(false), (5 + ((q * 5) % 20)) * 1e-6),
    t2_error: val(st(false), 0.8e-6),
    t2_state: st(false),
    readout_fidelity: val(roState, q === 25 ? 0.85 : 0.97 - 0.002 * (q % 10)),
    readout_error: null,
    readout_state: roState,
    frb_isolated: val(frbState, 0.9995 - 0.0001 * (q % 5)),
    frb_isolated_error: val(frbState, 1e-4),
    frb_isolated_state: frbState,
    frb_simultaneous: val(frbState, q === 19 ? 0.99 : 0.999 - 0.0003 * (q % 13)),
    frb_simultaneous_error: val(frbState, 3e-4),
    frb_simultaneous_state: frbState,
    rx_duration_ns: absent ? null : 40,
    has_calibration: !absent,
    raw_values: frbState === "sentinel" ? { fRB_simultaneous: { value: 0.5, error: 1.0, group: "benchmark:randomized_benchmark_simultaneous_1q" } } : {},
  };
  if (withLattice) {
    row.lattice_row = Math.floor(q / LATTICE.width);
    row.lattice_col = q % LATTICE.width;
  }
  if (withTimes) {
    row.t1_measured_at = t(row.t1_state, q === 10 ? STALE : FRESH);
    row.t2_measured_at = t(row.t2_state);
    row.readout_measured_at = t(row.readout_state);
    row.frb_isolated_measured_at = t(row.frb_isolated_state);
    // q0's fRB is the newest measurement — the snapshot's source time.
    row.frb_simultaneous_measured_at = t(row.frb_simultaneous_state, q === 0 ? SOURCE_TIMESTAMP : FRESH);
  }
  return row;
}

function wireEdge(a: number, b: number, withTimes: boolean): WireEdge {
  const ca = chipletOf(a), cb = chipletOf(b);
  const inter = ca !== cb;
  const key = `${a}-${b}`;
  const sentinel = SENTINEL_COUPLERS.includes(key);
  const fcz = key === "3-4" ? 0.975 : key === "2-3" ? 0.95 : inter ? 0.985 - 0.001 * (a % 5) : 0.995 - 0.0005 * ((a + b) % 7);
  return {
    node_a: a,
    node_b: b,
    presence: "active",
    cz_fidelity: sentinel ? null : fcz,
    cz_error: sentinel ? null : 0.002,
    cz_state: sentinel ? "sentinel" : "active",
    cz_duration_ns: 200,
    has_calibration: true,
    chiplet_a: ca,
    chiplet_b: cb,
    is_inter_chiplet: inter,
    corridor_id: inter ? `${ca}-${cb}` : null,
    raw_values: sentinel ? { fCZ: { value: 0.5, error: 1.0, group: "instruction:CZ" } } : {},
    ...(withTimes ? { cz_measured_at: sentinel ? null : FRESH } : {}),
  };
}

function envelope<T>(data: T) {
  return {
    backend_id: "Cepheus-1-108Q",
    calibration_id: CALIBRATION_ID,
    source_timestamp: SOURCE_TIMESTAMP,
    snapshot_age_seconds: SNAPSHOT_AGE_SECONDS,
    is_stale: false,
    topology_provenance: "vendor_confirmed" as const,
    descriptor_id: "synthetic@1.0.0",
    ingest_status: "complete" as const,
    data,
  };
}

export interface SyntheticOptions {
  /** false = a rigetti-proxy deployed before lattice positions. */
  withLattice?: boolean;
  /** false = a snapshot stored before per-metric timestamps. */
  withTimes?: boolean;
}

export function wireQubits({ withLattice = true, withTimes = true }: SyntheticOptions = {}) {
  const qubits = Array.from({ length: LATTICE.width * LATTICE.height }, (_, q) => wireQubit(q, withLattice, withTimes));
  return envelope(withLattice ? { qubits, lattice: LATTICE } : { qubits });
}

export function wireEdges({ withTimes = true }: SyntheticOptions = {}) {
  const edges: WireEdge[] = [];
  for (let q = 0; q < LATTICE.width * LATTICE.height; q++) {
    const r = Math.floor(q / LATTICE.width), c = q % LATTICE.width;
    for (const n of [c + 1 < LATTICE.width ? q + 1 : -1, r + 1 < LATTICE.height ? q + LATTICE.width : -1]) {
      if (n < 0 || ABSENT.includes(q) || ABSENT.includes(n)) continue;
      edges.push(wireEdge(q, n, withTimes));
    }
  }
  return envelope({ edges });
}

/** Runs the synthetic wire responses through the real client normalization (fetchQubits/fetchEdges). */
export async function loadSynthetic(options: SyntheticOptions = {}) {
  const files: Record<string, unknown> = { qubits: wireQubits(options), edges: wireEdges(options) };
  vi.stubGlobal("fetch", async (url: string) => ({
    ok: true,
    json: async () => files[url.split("?")[0].split("/").pop() as string],
  }));
  try {
    const qubitsEnvelope = await fetchQubits();
    const edges = (await fetchEdges()).data;
    const { data, ...meta } = qubitsEnvelope;
    return { qubitsEnvelope, meta, qubits: data.qubits, lattice: data.lattice, edges };
  } finally {
    vi.unstubAllGlobals();
  }
}
