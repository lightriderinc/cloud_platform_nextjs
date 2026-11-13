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

/** Extra context for the status badge, set when the status comes from the
 *  server-side status light (lib/backends/status). Absent for providers that
 *  report a status directly (IBM) or are hardcoded. */
export interface BackendStatusInfo {
  /** Overrides the badge's default label, e.g. "Checking" or "Outside window". */
  label?: string;
  /** Why the status is what it is, shown as the badge tooltip. */
  reason?: string;
  /** How long ago the server last checked this backend, in ms. */
  checkedAgeMs?: number;
  /** How long ago the backend last reported healthy, in ms (null = never seen). */
  lastHealthyAgeMs?: number | null;
}

export interface BackendPricing {
  creditsPerSecond: number;
  creditsPerHour: number;
}

/** A single window during which a machine can run jobs. */
export interface AvailabilityWindow {
  /** ISO 8601 start timestamp. */
  start: string;
  /** ISO 8601 end timestamp. */
  end: string;
}

/** Live availability for a machine, derived from a provider's window feed
 *  (IQM's queue-availability). Undefined on the Backend when the provider
 *  doesn't report it. */
export interface BackendAvailability {
  /** True if the machine can run a job right now. */
  availableNow: boolean;
  /** ISO start of the next window when not available now; null when available
   *  now or when no upcoming window is known. */
  nextWindowStart: string | null;
  /** Upcoming windows, kept for the modal (and a future availability calendar). */
  windows?: AvailabilityWindow[];
}

export interface QubitNode {
  id: string;
  label: string;
  /** Per-qubit error as a percent (e.g. 0.05), or undefined if unknown. */
  error?: number;
  /** Optional physical layout coordinates from the provider (e.g. IBM's
   *  heavy-hex `coords`). When present, the map uses them directly instead of
   *  inferring a layout from the connectivity graph. */
  x?: number;
  y?: number;
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
  /** Reason and freshness behind `status`, when known. */
  statusInfo?: BackendStatusInfo;
  qubits: number;
  provider: string;
  /** Jobs currently queued, or null when unknown (e.g. coming soon). */
  queueDepth: number | null;
  /** Typical wait before a job starts, in ms, for providers that report a
   *  queue time instead of a depth (IonQ). Undefined/null when not reported. */
  queueTimeMs?: number | null;
  /** Text for the Provider row when it should say more than `provider`, e.g.
   *  "IonQ Cloud" for IonQ devices whose jobs run on IonQ's cloud. Display
   *  only: filtering and sorting still use `provider`. */
  providerLabel?: string;
  /** Simulator noise model ("Ideal", "Forte"), for providers that report one (IonQ). */
  noiseModel?: string;
  /** Live availability windows, or undefined when the provider doesn't report
   *  it. */
  availability?: BackendAvailability;
  pricing?: BackendPricing;
  details?: BackendDetails;
}
