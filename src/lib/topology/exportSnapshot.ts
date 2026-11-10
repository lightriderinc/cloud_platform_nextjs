import type { EdgeEntry, LatticeShape, Metric, QubitEntry, TopologyEnvelope } from "./client";

// Client-side export of the snapshot the topology view already has — no
// request, no server endpoint. Same values the page shows: a sentinel or
// absent metric exports as value null with its state, never the vendor's
// 0.5 placeholder (raw_values is deliberately not exported).
//
// Deterministic for a given snapshot: no export time is written, so the
// same calibration_id always exports byte-identical files.

export const SNAPSHOT_EXPORT_FORMAT = "lightrider.topology-snapshot";
export const SNAPSHOT_EXPORT_VERSION = 1;

type Meta = Omit<TopologyEnvelope<unknown>, "data" | "snapshotAgeSeconds" | "isStale">;

interface ExportMetric {
  value: number | null;
  error: number | null;
  state: Metric["state"];
  measured_at: string | null;
}

function exportMetric(m: Metric): ExportMetric {
  return { value: m.value, error: m.error, state: m.state, measured_at: m.measuredAt };
}

// Metric name in the export (units in the name) -> how to read it off a qubit.
const QUBIT_METRICS: [string, (q: QubitEntry) => Metric][] = [
  ["t1_seconds", (q) => q.t1],
  ["t2_star_seconds", (q) => q.t2],
  ["readout_fidelity", (q) => q.readout],
  ["frb_isolated", (q) => q.frbIsolated],
  ["frb_simultaneous", (q) => q.frbSimultaneous],
];

function sortedQubits(qubits: QubitEntry[]): QubitEntry[] {
  return [...qubits].sort((a, b) => a.qubitIndex - b.qubitIndex);
}

function sortedEdges(edges: EdgeEntry[]): EdgeEntry[] {
  return [...edges].sort((a, b) => a.nodeA - b.nodeA || a.nodeB - b.nodeB);
}

export function snapshotJson(meta: Meta, lattice: LatticeShape | null, qubits: QubitEntry[], edges: EdgeEntry[]): string {
  return JSON.stringify(
    {
      format: SNAPSHOT_EXPORT_FORMAT,
      format_version: SNAPSHOT_EXPORT_VERSION,
      backend_id: meta.backendId,
      calibration_id: meta.calibrationId,
      snapshot_timestamp: meta.sourceTimestamp,
      topology_provenance: meta.topologyProvenance,
      descriptor_id: meta.descriptorId,
      ingest_status: meta.ingestStatus,
      lattice: lattice && {
        width: lattice.width,
        height: lattice.height,
        chiplet_size: lattice.chipletSize,
        chiplet_array_cols: lattice.chipletArrayCols,
        chiplet_array_rows: lattice.chipletArrayRows,
      },
      qubits: sortedQubits(qubits).map((q) => ({
        qubit_index: q.qubitIndex,
        chiplet_id: q.chipletId,
        lattice_row: q.latticeRow,
        lattice_col: q.latticeCol,
        presence: q.presence,
        ...Object.fromEntries(QUBIT_METRICS.map(([name, pick]) => [name, exportMetric(pick(q))])),
        rx_duration_ns: q.rxDurationNs,
      })),
      couplers: sortedEdges(edges).map((e) => ({
        node_a: e.nodeA,
        node_b: e.nodeB,
        chiplet_a: e.chipletA,
        chiplet_b: e.chipletB,
        is_inter_chiplet: e.isInterChiplet,
        corridor_id: e.corridorId,
        presence: e.presence,
        cz_fidelity: exportMetric(e.cz),
        cz_duration_ns: e.czDurationNs,
      })),
    },
    null,
    2,
  );
}

/** RFC 4180-ish: null -> empty field; quote anything with a comma, quote or newline. */
function csvField(v: string | number | boolean | null): string {
  if (v === null) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(header: string[], rows: (string | number | boolean | null)[][]): string {
  return [header, ...rows].map((r) => r.map(csvField).join(",")).join("\r\n") + "\r\n";
}

const metricColumns = (name: string) => [name, `${name}_error`, `${name}_state`, `${name}_measured_at`];
const metricCells = (m: Metric) => [m.value, m.error, m.state, m.measuredAt];

/** One row per qubit; calibration_id on every row so the file identifies its snapshot on its own. */
export function qubitsCsv(meta: Meta, qubits: QubitEntry[]): string {
  return csv(
    [
      "calibration_id",
      "qubit_index",
      "chiplet_id",
      "lattice_row",
      "lattice_col",
      "presence",
      ...QUBIT_METRICS.flatMap(([name]) => metricColumns(name)),
      "rx_duration_ns",
    ],
    sortedQubits(qubits).map((q) => [
      meta.calibrationId,
      q.qubitIndex,
      q.chipletId,
      q.latticeRow,
      q.latticeCol,
      q.presence,
      ...QUBIT_METRICS.flatMap(([, pick]) => metricCells(pick(q))),
      q.rxDurationNs,
    ]),
  );
}

export function couplersCsv(meta: Meta, edges: EdgeEntry[]): string {
  return csv(
    [
      "calibration_id",
      "node_a",
      "node_b",
      "chiplet_a",
      "chiplet_b",
      "is_inter_chiplet",
      "corridor_id",
      "presence",
      ...metricColumns("cz_fidelity"),
      "cz_duration_ns",
    ],
    sortedEdges(edges).map((e) => [
      meta.calibrationId,
      e.nodeA,
      e.nodeB,
      e.chipletA,
      e.chipletB,
      e.isInterChiplet,
      e.corridorId,
      e.presence,
      ...metricCells(e.cz),
      e.czDurationNs,
    ]),
  );
}

/** "cepheus-1-108q_7637d10fcd10_20261027" — backend, calibration id (12 chars), and the snapshot's own source date (UTC), not the download date. */
export function exportBaseName(meta: Meta): string {
  const backend = meta.backendId.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const cal = meta.calibrationId.replace(/^sha256:/, "").slice(0, 12);
  const d = meta.sourceTimestamp ? new Date(meta.sourceTimestamp) : null;
  const date =
    d && !Number.isNaN(d.getTime())
      ? `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`
      : "undated";
  return `${backend}_${cal}_${date}`;
}
