// Typed fetchers for /api/lr/topology/* — the BFF routes (proxyTopologyGet)
// pass qpu-proxy's raw envelope through completely unchanged, so ALL
// normalization from qpu-proxy's snake_case wire format into this
// codebase's usual camelCase happens here, the same boundary
// lib/quantum/reservations.ts already normalizes at.
//
// Every envelope field is preserved end to end, not dropped at the fetch
// boundary — calibrationId and sourceTimestamp travel with every payload so
// the UI can always show which snapshot a given fidelity came from (a
// displayed fidelity is only meaningful against the hardware state it
// came from).
//
// All shapes below (envelope, corridors, qubits, edges) are confirmed
// against live responses (2026-08-19) — no dual-field-name fallbacks; if a
// field is renamed upstream this should fail loudly (undefined), not
// silently guess a fallback name.

export const DEFAULT_TOPOLOGY_BACKEND_ID = "Cepheus-1-108Q";

// Per-metric state — genuinely independent per metric on a qubit (t1_state,
// t2_state, readout_state, frb_isolated_state, frb_simultaneous_state) or
// the qubit/edge's own cz_state — never collapsed into one field. 8 qubits
// on the reference snapshot are SENTINEL on fRB while ACTIVE on T1/T2/fRO;
// that's the whole reason this vocabulary is per-metric, not per-entity.
export type MetricState = "active" | "degraded" | "sentinel" | "absent";
export type TopologyProvenance = "inferred" | "vendor_confirmed";

export interface TopologyEnvelope<T> {
  backendId: string;
  calibrationId: string;
  sourceTimestamp: string;
  snapshotAgeSeconds: number;
  isStale: boolean;
  topologyProvenance: TopologyProvenance;
  descriptorId: string;
  ingestStatus: "complete" | "partial";
  data: T;
}

export interface CorridorEntry {
  corridorId: string;
  expectedLinks: number;
  validLinks: number;
  sentinelLinks: number;
  missingLinks: number;
  coverage: number;
  /** null means unmeasured (e.g. every link SENTINEL) — never 0, never a default. */
  meanFcz: number | null;
  bestLinkFcz: number | null;
  bestLink: [number, number] | null;
  /** mean_fcz × coverage. null when meanFcz is null — an unranked corridor has no score, not a score of 0. */
  score: number | null;
}

export interface CorridorsData {
  ranked: CorridorEntry[];
  /** Corridors excluded from ranking (e.g. all-sentinel) — render separately with their own reason, never appended to the bottom of `ranked`. */
  unranked: CorridorEntry[];
}

/** One metric's value + error bar + state, kept together since a null error does NOT imply "unmeasured" (readout never carries an error bar even when active) — state is the only field that says whether the value is meaningful. */
export interface Metric {
  value: number | null;
  error: number | null;
  state: MetricState;
}

export interface QubitEntry {
  qubitIndex: number;
  /** Entity-level: is this qubit exposed in the ISA at all. Independent of every per-metric state below. */
  presence: MetricState;
  /** Present even for an absent qubit (q8 still has chiplet_id "C3") — position is physical even when the qubit isn't exposed. */
  chipletId: string | null;
  t1: Metric;
  t2: Metric;
  readout: Metric;
  /** Qubit driven alone. Never averaged with frbSimultaneous — they measure different things. */
  frbIsolated: Metric;
  /** All 107 qubits driven at once, includes crosstalk — the honest figure for real circuits. Label distinctly from frbIsolated wherever both appear. */
  frbSimultaneous: Metric;
  rxDurationNs: number | null;
  hasCalibration: boolean;
  /** Vendor's original record, including the sentinel placeholder (e.g. {value:0.5,error:1.0}) — informational only, NEVER read as a fidelity. Rendered verbatim in the detail view, never parsed into a displayed number. */
  rawValues: Record<string, unknown>;
}

export interface EdgeEntry {
  /** Always nodeA < nodeB. */
  nodeA: number;
  nodeB: number;
  presence: MetricState;
  cz: Metric;
  czDurationNs: number | null;
  hasCalibration: boolean;
  chipletA: string | null;
  chipletB: string | null;
  isInterChiplet: boolean | null;
  /** null for intra-chiplet edges (142/193 on the reference snapshot) — normal, not missing data. */
  corridorId: string | null;
  rawValues: Record<string, unknown>;
}

/** /topology/status's `data` shape isn't documented beyond the shared envelope fields — treated as opaque until a live shape is confirmed. */
export type TopologyStatusData = Record<string, unknown>;

interface RawEnvelope<T> {
  backend_id: string;
  calibration_id: string;
  source_timestamp: string;
  snapshot_age_seconds: number;
  is_stale: boolean;
  topology_provenance: TopologyProvenance;
  descriptor_id: string;
  ingest_status: "complete" | "partial";
  data: T;
}

interface RawCorridorEntry {
  corridor_id: string;
  expected_links: number;
  valid_links: number;
  sentinel_links: number;
  missing_links: number;
  coverage: number;
  mean_fcz: number | null;
  best_link_fcz: number | null;
  best_link: [number, number] | null;
  score: number | null;
}

interface RawCorridorsData {
  ranked: RawCorridorEntry[];
  unranked: RawCorridorEntry[];
}

interface RawQubitEntry {
  qubit_index: number;
  presence: MetricState;
  chiplet_id: string | null;
  t1_seconds: number | null;
  t1_error: number | null;
  t1_state: MetricState;
  t2_seconds: number | null;
  t2_error: number | null;
  t2_state: MetricState;
  readout_fidelity: number | null;
  readout_error: number | null;
  readout_state: MetricState;
  frb_isolated: number | null;
  frb_isolated_error: number | null;
  frb_isolated_state: MetricState;
  frb_simultaneous: number | null;
  frb_simultaneous_error: number | null;
  frb_simultaneous_state: MetricState;
  rx_duration_ns: number | null;
  has_calibration: boolean;
  raw_values: Record<string, unknown>;
}

interface RawQubitsData {
  qubits: RawQubitEntry[];
}

interface RawEdgeEntry {
  node_a: number;
  node_b: number;
  presence: MetricState;
  cz_fidelity: number | null;
  cz_error: number | null;
  cz_state: MetricState;
  cz_duration_ns: number | null;
  has_calibration: boolean;
  chiplet_a: string | null;
  chiplet_b: string | null;
  is_inter_chiplet: boolean | null;
  corridor_id: string | null;
  raw_values: Record<string, unknown>;
}

interface RawEdgesData {
  edges: RawEdgeEntry[];
}

function normalizeEnvelope<TRaw, TOut>(
  raw: RawEnvelope<TRaw>,
  normalizeData: (data: TRaw) => TOut,
): TopologyEnvelope<TOut> {
  return {
    backendId: raw.backend_id,
    calibrationId: raw.calibration_id,
    sourceTimestamp: raw.source_timestamp,
    snapshotAgeSeconds: raw.snapshot_age_seconds,
    isStale: raw.is_stale,
    topologyProvenance: raw.topology_provenance,
    descriptorId: raw.descriptor_id,
    ingestStatus: raw.ingest_status,
    data: normalizeData(raw.data),
  };
}

function normalizeCorridorEntry(raw: RawCorridorEntry): CorridorEntry {
  return {
    corridorId: raw.corridor_id,
    expectedLinks: raw.expected_links,
    validLinks: raw.valid_links,
    sentinelLinks: raw.sentinel_links,
    missingLinks: raw.missing_links,
    coverage: raw.coverage,
    meanFcz: raw.mean_fcz,
    bestLinkFcz: raw.best_link_fcz,
    bestLink: raw.best_link,
    score: raw.score,
  };
}

function normalizeQubitEntry(raw: RawQubitEntry): QubitEntry {
  return {
    qubitIndex: raw.qubit_index,
    presence: raw.presence,
    chipletId: raw.chiplet_id,
    t1: { value: raw.t1_seconds, error: raw.t1_error, state: raw.t1_state },
    t2: { value: raw.t2_seconds, error: raw.t2_error, state: raw.t2_state },
    readout: { value: raw.readout_fidelity, error: raw.readout_error, state: raw.readout_state },
    frbIsolated: {
      value: raw.frb_isolated,
      error: raw.frb_isolated_error,
      state: raw.frb_isolated_state,
    },
    frbSimultaneous: {
      value: raw.frb_simultaneous,
      error: raw.frb_simultaneous_error,
      state: raw.frb_simultaneous_state,
    },
    rxDurationNs: raw.rx_duration_ns,
    hasCalibration: raw.has_calibration,
    rawValues: raw.raw_values ?? {},
  };
}

function normalizeEdgeEntry(raw: RawEdgeEntry): EdgeEntry {
  return {
    nodeA: raw.node_a,
    nodeB: raw.node_b,
    presence: raw.presence,
    cz: { value: raw.cz_fidelity, error: raw.cz_error, state: raw.cz_state },
    czDurationNs: raw.cz_duration_ns,
    hasCalibration: raw.has_calibration,
    chipletA: raw.chiplet_a,
    chipletB: raw.chiplet_b,
    isInterChiplet: raw.is_inter_chiplet,
    corridorId: raw.corridor_id,
    rawValues: raw.raw_values ?? {},
  };
}

async function fetchTopologyJson<T>(path: string, backendId: string): Promise<RawEnvelope<T>> {
  const params = new URLSearchParams({ backend_id: backendId });
  const res = await fetch(`/api/lr/topology/${path}?${params}`);
  if (!res.ok) {
    const body: Record<string, unknown> = await res.json().catch(() => ({}));
    throw new Error((body.message as string) ?? (body.error as string) ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchCorridors(
  backendId: string = DEFAULT_TOPOLOGY_BACKEND_ID,
): Promise<TopologyEnvelope<CorridorsData>> {
  const raw = await fetchTopologyJson<RawCorridorsData>("corridors", backendId);
  return normalizeEnvelope(raw, (data) => ({
    ranked: (data.ranked ?? []).map(normalizeCorridorEntry),
    unranked: (data.unranked ?? []).map(normalizeCorridorEntry),
  }));
}

export async function fetchQubits(
  backendId: string = DEFAULT_TOPOLOGY_BACKEND_ID,
): Promise<TopologyEnvelope<QubitEntry[]>> {
  const raw = await fetchTopologyJson<RawQubitsData>("qubits", backendId);
  return normalizeEnvelope(raw, (data) => (data.qubits ?? []).map(normalizeQubitEntry));
}

export async function fetchEdges(
  backendId: string = DEFAULT_TOPOLOGY_BACKEND_ID,
): Promise<TopologyEnvelope<EdgeEntry[]>> {
  const raw = await fetchTopologyJson<RawEdgesData>("edges", backendId);
  return normalizeEnvelope(raw, (data) => (data.edges ?? []).map(normalizeEdgeEntry));
}

export async function fetchTopologyStatus(
  backendId: string = DEFAULT_TOPOLOGY_BACKEND_ID,
): Promise<TopologyEnvelope<TopologyStatusData>> {
  const raw = await fetchTopologyJson<TopologyStatusData>("status", backendId);
  return normalizeEnvelope(raw, (data) => data ?? {});
}
