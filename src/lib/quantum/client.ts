import { QUANTUM_BACKENDS, type QuantumBackendId } from "@/lib/quantum/backends";
import type { JobDetail, JobStatus, MeasurementCounts } from "@/types/job";

interface QuantumCircuitInstruction {
  name: string;
  qubits: number[];
  clbits?: number[];
}

interface QuantumCircuitPayload {
  num_qubits: number;
  instructions: QuantumCircuitInstruction[];
}

/**
 * /api/lr/quantum/submit expects a full circuit object, not a gate shorthand
 * — unlike the old /api/lr/jobs, which accepted {gate, shots} directly and
 * resolved the preset server-side. These mirror the exact shapes already
 * verified against the real API in docs/notebooks/quantum-quickstart.ipynb,
 * matching the same "h"/"bell" preset names DemoCircuitModal/NewJobModal
 * already exposed before this migration.
 */
export const CIRCUIT_PAYLOADS: Record<"h" | "bell", QuantumCircuitPayload> = {
  h: {
    num_qubits: 1,
    instructions: [
      { name: "h", qubits: [0] },
      { name: "measure", qubits: [0], clbits: [0] },
    ],
  },
  bell: {
    num_qubits: 2,
    instructions: [
      { name: "h", qubits: [0] },
      { name: "cx", qubits: [0, 1] },
      { name: "measure", qubits: [0], clbits: [0] },
      { name: "measure", qubits: [1], clbits: [1] },
    ],
  },
};

async function parseErrorMessage(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return data.message ?? data.error ?? `HTTP ${res.status}`;
}

export interface QuantumJobHandle {
  uuid: string;
  // iqm-proxy's submit response doesn't always echo a status, so callers
  // that need one (e.g. to seed a Job record) should default it themselves.
  status?: JobStatus;
}

function normalizeJob(data: Record<string, unknown>): QuantumJobHandle {
  return {
    uuid: (data.job_uuid ?? data.uuid ?? data.id) as string,
    status: data.status as JobStatus | undefined,
  };
}

/**
 * Submits via the caller's own Logto session — same-origin fetch() carries
 * session cookies automatically, so no API key is needed for in-app calls.
 * (External SDK/Colab callers use the same route with a bearer key instead;
 * see resolveCustomerFromRequest.)
 */
export class BackendBusyError extends Error {
  constructor(public nextAvailableAt: string, deviceLabel: string) {
    super(
      `${deviceLabel} is busy right now. Next available at ${new Date(nextAvailableAt).toLocaleString()}.`,
    );
    this.name = "BackendBusyError";
  }
}

export async function submitQuantumJob(
  backend: QuantumBackendId,
  circuit: QuantumCircuitPayload,
  shots: number,
): Promise<QuantumJobHandle> {
  const res = await fetch("/api/lr/quantum/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ backend, circuit, shots }),
  });
  if (res.status === 503) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "busy" && typeof data.nextAvailableAt === "string") {
      throw new BackendBusyError(data.nextAvailableAt, QUANTUM_BACKENDS[backend].deviceInstance);
    }
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return normalizeJob(await res.json());
}

export async function fetchQuantumJobDetail(jobId: string): Promise<JobDetail> {
  const res = await fetch(`/api/lr/quantum/jobs/${jobId}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json();
}

export async function fetchQuantumJobResult(jobId: string): Promise<MeasurementCounts | null> {
  const res = await fetch(`/api/lr/quantum/jobs/${jobId}/result`);
  if (res.status === 409) return null;
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  const data = await res.json();
  return data.counts ?? data.measurement_counts ?? data;
}
