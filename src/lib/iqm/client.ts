import type { Backend } from "@/types/backend";
import { asMicroseconds, asPercent, median } from "@/lib/metrics";

// Live IQM Resonance integration. Fetches each machine's static architecture
// and latest calibration metrics through the server-side /api/iqm proxy, then
// maps them into our Backend shape. All field paths below were derived from
// real Cocos responses.

const IQM_MACHINES = ["garnet", "emerald", "sirius"] as const;
type IqmMachine = (typeof IQM_MACHINES)[number];

interface StaticArchitecture {
  qubits: string[];
  connectivity: string[][];
  computational_resonators?: string[];
}

interface MetricObservation {
  dut_field: string;
  value: number | null;
  invalid: boolean;
}

interface MetricsResponse {
  observations: MetricObservation[];
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`IQM request failed (${res.status}): ${path}`);
  }
  return (await res.json()) as T;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mapMachine(
  machine: IqmMachine,
  architecture: StaticArchitecture[] | StaticArchitecture,
  metrics: MetricsResponse,
): Backend {
  const arch = Array.isArray(architecture) ? architecture[0] : architecture;
  const valid = metrics.observations.filter(
    (o): o is MetricObservation & { value: number } =>
      !o.invalid && typeof o.value === "number",
  );
  const valuesWhere = (match: (field: string) => boolean): number[] =>
    valid.filter((o) => match(o.dut_field)).map((o) => o.value);

  const name = `IQM ${titleCase(machine)}`;

  const nativeGates = (
    [
      ["prx", (f: string) => f.includes("metrics.rb.prx")],
      ["cz", (f: string) => f.includes("metrics.irb.cz") || f.includes(".uz_cz")],
      ["measure", (f: string) => f.includes("metrics.ssro.measure.")],
      ["measure_fidelity", (f: string) => f.includes("metrics.ssro.measure_fidelity")],
    ] as Array<[string, (field: string) => boolean]>
  )
    .filter(([, match]) => valid.some((o) => match(o.dut_field)))
    .map(([gate]) => gate);

  const qubitErrors: Record<string, number> = {};
  for (const o of valid) {
    if (o.dut_field.includes("metrics.rb.prx.drag_crf_sx")) {
      const m = o.dut_field.match(/QB\d+/);
      if (m) qubitErrors[m[0]] = Number(((1 - o.value) * 100).toFixed(3));
    }
  }
  const qubitMap = arch?.qubits
    ? {
        nodes: arch.qubits.map((q) => ({ id: q, label: q, error: qubitErrors[q] })),
        edges: (arch.connectivity ?? []).map(([a, b]) => ({ source: a, target: b })),
        errorLabel: "PRX gate error",
      }
    : undefined;

  return {
    id: `iqm.qpu.${machine}`,
    name,
    type: "QPU",
    // These endpoints report calibration, not live availability. Reaching this
    // map means the calls succeeded, so we treat the machine as online.
    status: "online",
    qubits: arch?.qubits?.length ?? 0,
    provider: "IQM",
    queueDepth: null,
    details: {
      description: `${name} is a superconducting quantum processor, with calibration data pulled live from IQM Resonance.`,
      nativeGates,
      qubitMap,
      medianOneQubitFidelity: asPercent(
        median(valuesWhere((f) => f.includes("metrics.rb.prx.drag_crf_sx"))),
      ),
      medianTwoQubitFidelity: asPercent(
        median(valuesWhere((f) => f.includes("metrics.irb.cz.slepian_crf"))),
      ),
      medianReadoutFidelity: asPercent(
        median(
          valuesWhere(
            (f) =>
              f.includes("metrics.ssro.measure.constant.") &&
              f.endsWith(".fidelity"),
          ),
        ),
      ),
      medianT1Us: asMicroseconds(
        median(valuesWhere((f) => f.endsWith(".t1_time"))),
      ),
      medianT2RamseyUs: asMicroseconds(
        median(valuesWhere((f) => f.endsWith(".t2_time"))),
      ),
      medianT2EchoUs: asMicroseconds(
        median(valuesWhere((f) => f.endsWith(".t2_echo_time"))),
      ),
    },
  };
}

// Fetches all IQM machines in parallel. A machine that fails (offline, auth,
// etc.) is dropped rather than failing the whole list.
export async function fetchIqmBackends(): Promise<Backend[]> {
  const settled = await Promise.allSettled(
    IQM_MACHINES.map(async (machine) => {
      const [architecture, metrics] = await Promise.all([
        getJson<StaticArchitecture[]>(
          `/api/iqm/api/v1/quantum-computers/${machine}/artifacts/static-quantum-architectures`,
        ),
        getJson<MetricsResponse>(
          `/api/iqm/api/v1/calibration-sets/${machine}/default/metrics`,
        ),
      ]);
      return mapMachine(machine, architecture, metrics);
    }),
  );

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<Backend> => r.status === "fulfilled",
    )
    .map((r) => r.value);
}
