import type { Backend } from "@/types/backend";
import { asMicroseconds, asPercent, median } from "@/lib/metrics";

// Live Rigetti QCS integration. Maps each hardcoded processor's Instruction
// Set Architecture (ISA) into our Backend shape. Field names below were
// derived from a real ISA response (Cepheus-1-108Q / Ankaa).

// Hardcoded machine list, like IQM and IBM (project convention: no
// auto-discovery). Skipping the processor-list round trip lets the cards
// paint after a single parallel ISA fetch.
const RIGETTI_MACHINES = ["Cepheus-1-108Q"];

interface RigettiCharacteristic {
  name: string;
  value: number;
}

interface RigettiOperationSite {
  node_ids: number[];
  characteristics: RigettiCharacteristic[];
}

interface RigettiOperation {
  name: string;
  characteristics: RigettiCharacteristic[];
  sites: RigettiOperationSite[];
}

interface RigettiArchitecture {
  family: string;
  nodes: { node_id: number }[];
  edges: { node_ids: number[] }[];
}

interface RigettiISA {
  name: string;
  architecture: RigettiArchitecture;
  instructions: RigettiOperation[];
  benchmarks: RigettiOperation[];
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`/api/rigetti/${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Rigetti request failed (${res.status}): ${path}`);
  }
  return (await res.json()) as T;
}

// Collects every value of a named characteristic for an operation, looking at
// both operation-level and per-site characteristics.
function characteristicValues(
  operations: RigettiOperation[],
  operationName: string,
  characteristicName: string,
): number[] {
  const op = operations.find((o) => o.name === operationName);
  if (!op) return [];
  const values: number[] = [];
  const eat = (cs: RigettiCharacteristic[]) => {
    for (const c of cs ?? []) {
      if (c.name === characteristicName && typeof c.value === "number") {
        values.push(c.value);
      }
    }
  };
  eat(op.characteristics);
  for (const site of op.sites ?? []) eat(site.characteristics);
  return values;
}

function mapProcessor(id: string, isa: RigettiISA): Backend {
  const name = `Rigetti ${isa.name ?? id}`;
  const arch = isa.architecture;

  const rb1q = (isa.benchmarks ?? []).find((o) => o.name === "randomized_benchmark_1q");
  const nodeError: Record<string, number> = {};
  if (rb1q) {
    for (const site of rb1q.sites ?? []) {
      const c = site.characteristics.find((ch) => ch.name === "fRB");
      const nid = site.node_ids?.[0];
      if (c && nid !== undefined) {
        nodeError[`Q${nid}`] = Number(((1 - c.value) * 100).toFixed(3));
      }
    }
  }
  const qubitMap = {
    nodes: (arch?.nodes ?? []).map((nd) => ({
      id: `Q${nd.node_id}`,
      label: `Q${nd.node_id}`,
      error: nodeError[`Q${nd.node_id}`],
    })),
    edges: (arch?.edges ?? []).map((e) => ({
      source: `Q${e.node_ids[0]}`,
      target: `Q${e.node_ids[1]}`,
    })),
    errorLabel: "1-qubit gate error",
  };

  return {
    id: `rigetti.qpu.${id}`,
    name,
    type: "QPU",
    // The ISA reports calibration, not live availability; a successful fetch
    // means the processor is reachable, so we treat it as online.
    status: "online",
    qubits: arch?.nodes?.length ?? 0,
    provider: "Rigetti",
    queueDepth: null,
    details: {
      description: `${name} is a superconducting quantum processor${arch?.family ? ` (Rigetti ${arch.family} family)` : ""}, with calibration data pulled live from Rigetti QCS.`,
      topology: arch?.family,
      nativeGates: (isa.instructions ?? []).map((o) => o.name),
      qubitMap,
      medianOneQubitFidelity: asPercent(
        median(
          characteristicValues(isa.benchmarks, "randomized_benchmark_1q", "fRB"),
        ),
      ),
      medianTwoQubitFidelity: asPercent(
        median(characteristicValues(isa.instructions, "CZ", "fCZ")),
      ),
      medianReadoutFidelity: asPercent(
        median(characteristicValues(isa.instructions, "MEASURE", "fRO")),
      ),
      medianT1Us: asMicroseconds(
        median(characteristicValues(isa.benchmarks, "FreeInversionRecovery", "T1")),
      ),
      medianT2RamseyUs: asMicroseconds(
        median(characteristicValues(isa.benchmarks, "FreeInductionDecay", "T2")),
      ),
    },
  };
}

// Fetches the hardcoded Rigetti processors in parallel. A processor that
// fails is dropped rather than failing the whole list. Card data and
// calibration share one ISA payload, so Rigetti is single-phase: there is no
// lighter endpoint to fetch first.
export async function fetchRigettiBackends(): Promise<Backend[]> {
  const settled = await Promise.allSettled(
    RIGETTI_MACHINES.map(async (id) => {
      const isa = await getJson<RigettiISA>(
        `v1/quantumProcessors/${id}/instructionSetArchitecture`,
      );
      return mapProcessor(id, isa);
    }),
  );
  return settled
    .filter(
      (r): r is PromiseFulfilledResult<Backend> => r.status === "fulfilled",
    )
    .map((r) => r.value);
}
