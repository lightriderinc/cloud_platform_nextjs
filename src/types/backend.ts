// Shared shape for a compute backend (QPU or simulator).
// Summary fields drive the catalog card; optional `details` and `pricing`
// drive the detail modal. Everything optional is rendered only when present,
// so partial data from the API still looks clean.

export type BackendStatus =
  | "online"
  | "paused"
  | "offline"
  | "maintenance"
  | "unknown";

export type BackendType = "QPU" | "Simulator";

export interface BackendPricing {
  creditsPerSecond: number;
  creditsPerHour: number;
}

export interface QubitNode {
  id: string;
  label: string;
  /** Per-qubit error as a percent (e.g. 0.05), or undefined if unknown. */
  error?: number;
}

export interface QubitEdge {
  source: string;
  target: string;
}

export interface QubitMapData {
  nodes: QubitNode[];
  edges: QubitEdge[];
  /** Tooltip label for the error metric, e.g. "PRX gate error". */
  errorLabel: string;
}

export interface BackendDetails {
  /** Short prose summary shown at the top of the modal. */
  description?: string;
  /** Qubit layout, e.g. "Square lattice" or "All-to-all". */
  topology?: string;
  /** Whether pulse-level programming is available. */
  pulseLevelAccess?: boolean;
  maxShotsPerCircuit?: number;
  maxCircuits?: number;
  /** Median single-qubit gate fidelity as a percent, e.g. 99.92. */
  medianOneQubitFidelity?: number;
  /** Median two-qubit gate fidelity as a percent. */
  medianTwoQubitFidelity?: number;
  /** Median single-shot readout fidelity as a percent. */
  medianReadoutFidelity?: number;
  /** Coherence times in microseconds. */
  medianT1Us?: number;
  medianT2RamseyUs?: number;
  medianT2EchoUs?: number;
  /** Names of the natively supported gates. */
  nativeGates?: string[];
  /** Per-qubit connectivity map with error data, for the modal visual. */
  qubitMap?: QubitMapData;
}

export interface Backend {
  /** Stable machine identifier, e.g. "lr.qpu.aurora". */
  id: string;
  name: string;
  type: BackendType;
  status: BackendStatus;
  qubits: number;
  provider: string;
  /** Jobs currently queued, or null when unknown (e.g. coming soon). */
  queueDepth: number | null;
  pricing?: BackendPricing;
  details?: BackendDetails;
}
