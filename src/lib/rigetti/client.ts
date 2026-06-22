import type { Backend } from "@/types/backend";
import { asMicroseconds, asPercent, median } from "@/lib/metrics";

// Live Rigetti QCS integration. Discovers the available processors, then maps
// each one's Instruction Set Architecture (ISA) into our Backend shape. Field
// names below were derived from a real ISA response (Cepheus-1-108Q / Ankaa).

interface RigettiCharacteristic {
  name: string;
  value: number;
}

interface RigettiOperationSite {
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

interface RigettiProcessorList {
  quantumProcessors: { id: string }[];
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

// Lists Rigetti processors and maps each in parallel. A processor that fails
// is dropped rather than failing the whole list.
export async function fetchRigettiBackends(): Promise<Backend[]> {
  const list = await getJson<RigettiProcessorList>("v1/quantumProcessors");
  const settled = await Promise.allSettled(
    (list.quantumProcessors ?? []).map(async (p) => {
      const isa = await getJson<RigettiISA>(
        `v1/quantumProcessors/${p.id}/instructionSetArchitecture`,
      );
      return mapProcessor(p.id, isa);
    }),
  );
  return settled
    .filter(
      (r): r is PromiseFulfilledResult<Backend> => r.status === "fulfilled",
    )
    .map((r) => r.value);
}
