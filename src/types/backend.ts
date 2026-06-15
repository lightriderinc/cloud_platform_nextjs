// Shared shape for a compute backend (QPU or simulator) shown on the Backends page.

export type BackendStatus =
  | "online"
  | "paused"
  | "offline"
  | "maintenance"
  | "unknown";

export type BackendType = "QPU" | "Simulator";

export interface Backend {
  /** Stable machine identifier, e.g. "lr.qpu.aurora". */
  id: string;
  /** Human-readable name shown as the card title. */
  name: string;
  /** Whether this is real hardware or a simulator. */
  type: BackendType;
  /** Current availability of the backend. */
  status: BackendStatus;
  /** Number of qubits the backend exposes. */
  qubits: number;
  /** Owning provider / where the backend is hosted. */
  provider: string;
  /** Jobs currently queued, or null when unknown (e.g. coming soon). */
  queueDepth: number | null;
}
