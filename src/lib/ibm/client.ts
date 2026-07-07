import type { Backend, BackendStatus } from "@/types/backend";
import { asPercent, median } from "@/lib/metrics";

// Live IBM Quantum (Qiskit Runtime) integration. Fetches the accessible
// backends list (status/queue), then each machine's configuration (qubits,
// coupling map, basis gates, physical coordinates) and properties (per-qubit
// T1/T2, readout and gate errors) through the server-side /api/ibm proxy, and
// maps them into our Backend shape. Field names below were derived from real
// Qiskit Runtime REST responses (ibm_kingston, Heron r2).
//
// The list is intentionally hardcoded (not auto-discovered) so IBM adding or
// experimenting with backends never surfaces unexpected cards on our frontend.
const IBM_MACHINES = ["ibm_kingston", "ibm_fez", "ibm_marrakesh"];

interface IbmDevice {
  name: string;
  status?: { name: string; reason?: string };
  qubits?: number;
  queue_length?: number;
  processor_type?: { family: string; revision: string };
}

interface IbmBackendsList {
  devices: IbmDevice[];
}

interface IbmConfiguration {
  backend_name: string;
  n_qubits: number;
  basis_gates: string[];
  coupling_map: number[][];
  coords?: number[][];
  open_pulse?: boolean;
  max_shots?: number;
  max_experiments?: number;
  processor_type?: { family: string; revision: string };
}

interface IbmMetric {
  name: string;
  unit: string;
  value: number;
}

interface IbmGate {
  gate: string;
  name: string;
  qubits: number[];
  parameters: IbmMetric[];
}

interface IbmProperties {
  qubits: IbmMetric[][];
  gates: IbmGate[];
  last_update_date?: string;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`/api/ibm/${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`IBM request failed (${res.status}): ${path}`);
  }
  return (await res.json()) as T;
}

// IBM's status.name maps onto our BackendStatus vocabulary.
function mapStatus(name: string | undefined): BackendStatus {
  switch ((name ?? "").toLowerCase()) {
    case "online":
      return "online";
    case "offline":
      return "offline";
    case "paused":
      return "paused";
    case "maintenance":
      return "maintenance";
    default:
      return "unknown";
  }
}

// All values of a named per-qubit metric across the chip (e.g. every T1).
function qubitValues(props: IbmProperties, name: string): number[] {
  const out: number[] = [];
  for (const q of props.qubits ?? []) {
    const m = q.find((e) => e.name === name);
    if (m && typeof m.value === "number") out.push(m.value);
  }
  return out;
}

// Per-qubit gate_error for a single-qubit gate, keyed by qubit index.
function singleQubitGateErrors(
  props: IbmProperties,
  gateName: string,
): Record<number, number> {
  const out: Record<number, number> = {};
  for (const g of props.gates ?? []) {
    if (g.gate !== gateName) continue;
    const q = g.qubits?.[0];
    const err = g.parameters?.find((p) => p.name === "gate_error")?.value;
    if (q !== undefined && typeof err === "number") out[q] = err;
  }
  return out;
}

// All gate_error values for a two-qubit gate across the chip (e.g. every CZ).
function twoQubitGateErrors(props: IbmProperties, gateName: string): number[] {
  const out: number[] = [];
  for (const g of props.gates ?? []) {
    if (g.gate !== gateName) continue;
    const err = g.parameters?.find((p) => p.name === "gate_error")?.value;
    if (typeof err === "number") out.push(err);
  }
  return out;
}

// Median of already-microsecond values (T1/T2), rounded to 1 dp. Unlike the
// shared asMicroseconds helper, IBM reports these in us already.
function medianUs(values: number[]): number | undefined {
  const m = median(values);
  return m === undefined ? undefined : Number(m.toFixed(1));
}

function mapBackend(
  alias: string,
  device: IbmDevice | undefined,
  config: IbmConfiguration,
  props: IbmProperties,
): Backend {
  const short = alias.replace(/^ibm_/, "");
  const displayName = `IBM ${short.charAt(0).toUpperCase()}${short.slice(1)}`;

  const family =
    config.processor_type?.family ?? device?.processor_type?.family;
  const revision =
    config.processor_type?.revision ?? device?.processor_type?.revision;
  const topology =
    family === "Heron"
      ? "Heavy-hex lattice"
      : family === "Nighthawk"
        ? "Square grid"
        : family;

  const qubits = config.n_qubits ?? device?.qubits ?? 0;
  const coords = config.coords ?? [];

  // Per-qubit single-qubit (sx) gate error, used to color the map nodes.
  const sxByQubit = singleQubitGateErrors(props, "sx");
  const czErrors = twoQubitGateErrors(props, "cz");
  const sxErrors = Object.values(sxByQubit);
  const readoutErrors = qubitValues(props, "readout_error");

  const nodes = Array.from({ length: qubits }, (_, i) => {
    const err = sxByQubit[i];
    const coord = coords[i];
    return {
      id: `Q${i}`,
      label: `Q${i}`,
      error: err === undefined ? undefined : Number((err * 100).toFixed(3)),
      x: coord?.[0],
      y: coord?.[1],
    };
  });

  // coupling_map lists both directions; collapse to unique undirected edges.
  const seen = new Set<string>();
  const edges: { source: string; target: string }[] = [];
  for (const pair of config.coupling_map ?? []) {
    const [a, b] = pair;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ source: `Q${a}`, target: `Q${b}` });
  }

  return {
    id: `ibm.${short}`,
    name: displayName,
    type: "QPU",
    status: mapStatus(device?.status?.name),
    qubits,
    provider: "IBM",
    queueDepth: device?.queue_length ?? null,
    details: {
      description: `${displayName} is a ${qubits}-qubit ${
        family ? `${family}${revision ? ` r${revision}` : ""} ` : ""
      }superconducting quantum processor, with calibration data pulled live from IBM Quantum.`,
      topology,
      pulseLevelAccess: config.open_pulse === true,
      maxShotsPerCircuit: config.max_shots,
      maxCircuits: config.max_experiments,
      nativeGates: config.basis_gates,
      qubitMap: { nodes, edges, errorLabel: "SX gate error" },
      medianOneQubitFidelity: asPercent(median(sxErrors.map((e) => 1 - e))),
      medianTwoQubitFidelity: asPercent(median(czErrors.map((e) => 1 - e))),
      medianReadoutFidelity: asPercent(
        median(readoutErrors.map((e) => 1 - e)),
      ),
      medianT1Us: medianUs(qubitValues(props, "T1")),
      medianT2EchoUs: medianUs(qubitValues(props, "T2")),
    },
  };
}

// Fetches the hardcoded IBM machines in parallel. The backends list (for
// status/queue) is best-effort; a machine whose configuration/properties fail
// is dropped rather than failing the whole list.
export async function fetchIbmBackends(): Promise<Backend[]> {
  const list = await getJson<IbmBackendsList>("api/v1/backends").catch(
    () => ({ devices: [] as IbmDevice[] }),
  );
  const deviceByName = new Map(list.devices.map((d) => [d.name, d]));

  const settled = await Promise.allSettled(
    IBM_MACHINES.map(async (alias) => {
      const [config, props] = await Promise.all([
        getJson<IbmConfiguration>(`api/v1/backends/${alias}/configuration`),
        getJson<IbmProperties>(`api/v1/backends/${alias}/properties`),
      ]);
      return mapBackend(alias, deviceByName.get(alias), config, props);
    }),
  );

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<Backend> => r.status === "fulfilled",
    )
    .map((r) => r.value);
}
