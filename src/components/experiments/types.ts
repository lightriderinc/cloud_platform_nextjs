// Catalog shape from GET /api/lr/experiments (rigetti-proxy
// experiments/registry.py's experiment_public_dict()) -- id/label/roles/
// params/prerequisites only.

export type RoleKind = "chiplet" | "processor" | (string & {});
export type RoleResolution = "select" | "whole_chiplet" | "whole_processor" | (string & {});

export interface ExperimentRole {
  key: string;
  label: string;
  kind: RoleKind;
  resolution: RoleResolution;
}

export type ParamType = "int" | "float" | "enum";

export interface ExperimentParam {
  name: string;
  type: ParamType;
  default: number | string;
  min?: number;
  max?: number;
  values?: string[];
}

export interface ExperimentPrerequisite {
  id: string;
  level: "required" | "recommended";
  why?: string;
}

export interface ExperimentDef {
  id: string;
  label: string;
  roles: ExperimentRole[];
  params: ExperimentParam[];
  prerequisites: ExperimentPrerequisite[];
}

export interface ExperimentCatalogResponse {
  experiments: ExperimentDef[];
}

// --- POST .../candidates ----------------------------------------------------

export type CandidateTier = "recommended" | "good" | "available" | "unsuitable" | (string & {});

export interface CandidateEntry {
  valid: boolean;
  score?: number;
  tier: CandidateTier;
  reasons?: Record<string, unknown>;
  reason_code?: string;
}

export interface CandidatesResponse {
  calibration_id?: string;
  snapshot_age_seconds?: number;
  topology_provenance?: string;
  // Optional, not guaranteed: this route is an unvalidated passthrough to
  // rigetti-proxy (see proxyBackendExperimentsPost), so the frontend can't
  // assume `map` is always present on a 200 response. A crash was traced to
  // exactly this assumption in ChipletVisualPicker — see candidateByChiplet.
  map?: Record<string, CandidateEntry>;
  ranked?: string[];
}

// --- POST .../placement ------------------------------------------------------

export interface PlacementWarning {
  title: string;
  body: string;
}

export interface PlacementDirective {
  physical_qubits: number[];
  allow_rewiring: boolean;
  [key: string]: unknown;
}

export interface PlacementData {
  roles?: Array<{ key: string; label: string; chiplet?: string; qubit?: number; auto?: boolean }>;
  edges?: Array<{ a: number; b: number; corridor?: string; fCZ?: number | null }>;
  qubits?: number[];
  warnings?: PlacementWarning[];
  placement_directive: PlacementDirective;
  estimated_shots?: number;
  [key: string]: unknown;
}

// --- POST .../runs + GET /runs/{id} ------------------------------------------

export type RunMode = "live" | "qvm";

export interface RunSubmitResponse {
  run_id: string;
  status: string;
}

export interface AnalysisHeadlineMetric {
  name?: string;
  label?: string;
  value: unknown;
  unit?: string;
  accent?: boolean;
  [key: string]: unknown;
}

export interface AnalysisResult {
  headline: AnalysisHeadlineMetric[];
  secondary: Record<string, unknown>;
  verdict: string;
  completion?: Record<string, unknown>;
}

export interface RunProgress {
  shots_requested: number | null;
  shots_completed: number;
  batches_total: number | null;
  batches_done: number;
}

export interface RunStatusResponse {
  run_id: string;
  experiment: string;
  backend_id: string;
  owner: string;
  status: string;
  stage: string | null;
  execution_mode: string;
  progress: RunProgress;
  calibration_id_at_submit: string;
  calibration_id_at_execution: string | null;
  deadline_seconds: number | null;
  requested_qubits: number[] | null;
  compiled_qubits: number[] | null;
  result: AnalysisResult | null;
  artifact_ref: string | null;
  error: string | null;
  warnings: PlacementWarning[];
  next_retry_at: string | null;
  queued_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

// Statuses the runner is known to pass through while a run is still in
// flight (experiments/runner.py) -- anything else (SUCCEEDED, FAILED, or a
// future value this UI has never seen) is treated as terminal, so an
// unrecognized status can never hang a poller.
export const NON_TERMINAL_RUN_STATUSES = new Set(["QUEUED", "COMPILING", "EXECUTING", "ANALYZING"]);

export function isTerminalRunStatus(status: string): boolean {
  return !NON_TERMINAL_RUN_STATUSES.has(status);
}

// --- entropy pool service (GET/POST /api/lr/entropy/*) ----------------------
// rigetti-proxy experiments/pool.py's confirmed response shapes.

export interface EntropyPoolEntry {
  chiplet_id: string;
  bits_available: number;
  bits_consumed: number;
  oldest_calibration_id: string | null;
  newest_calibration_id: string | null;
  last_refill_at: string | null;
  last_withdrawn_at: string | null;
}

export interface EntropyPoolsResponse {
  backend_id: string;
  pools: EntropyPoolEntry[];
}

export interface ChipletStream {
  chiplet_id: string;
  bits: number;
  data_base64: string;
  withdrawal_id: string | null;
}

export interface CorrelationPair {
  chiplet_a: string;
  chiplet_b: string;
  correlation: number;
}

export interface CrossChipletCorrelation {
  pairwise: CorrelationPair[];
  max_abs_correlation: number;
  note: string;
}

export interface InsufficientBits {
  chiplet_id: string;
  requested: number;
  available: number;
  alternatives: Array<{ chiplet_id: string; available_bits: number }>;
}

export interface WithdrawResponse {
  backend_id: string;
  combined: boolean;
  chiplets: ChipletStream[];
  insufficient: InsufficientBits | null;
  combined_stream?: ChipletStream;
  correlation?: CrossChipletCorrelation;
}
