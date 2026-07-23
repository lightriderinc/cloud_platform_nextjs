import type { Backend, BackendStatus, BackendType } from "@/types/backend";
import { asMicroseconds, asPercent, median } from "@/lib/metrics";

// Live IQM Resonance integration. Fetches each machine's static architecture
// and latest calibration metrics through the server-side /api/iqm proxy, then
// maps them into our Backend shape. All field paths below were derived from
// real Cocos responses.
//
// The list is intentionally hardcoded (not auto-discovered) so IQM adding or
// experimenting with backends never surfaces unexpected cards on our frontend.
// `alias` is the IQM identifier used in API paths (mock aliases include a colon,
// e.g. "garnet:mock", which the proxy URL-encodes).

interface IqmMachine {
  alias: string;
  name: string;
  type: BackendType;
}

const IQM_MACHINES: IqmMachine[] = [
  { alias: "garnet", name: "IQM Garnet", type: "QPU" },
  { alias: "emerald", name: "IQM Emerald", type: "QPU" },
  { alias: "sirius", name: "IQM Sirius", type: "QPU" },
  { alias: "garnet:mock", name: "IQM Garnet (mock)", type: "Simulator" },
  { alias: "emerald:mock", name: "IQM Emerald (mock)", type: "Simulator" },
  { alias: "sirius:mock", name: "IQM Sirius (mock)", type: "Simulator" },
];

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

interface HealthResponse {
  healthy: boolean;
  updated_at: string;
}

// IQM's health endpoint refreshes about every 15s. If the newest reading is
// older than this, its data has gone stale.
const HEALTH_STALE_MS = 60_000;

// Derives availability from a health reading:
//   unhealthy flag                -> offline
//   healthy + fresh timestamp     -> online
//   healthy + stale timestamp     -> unknown (still reporting healthy, but the
//                                    data has gone stale, so we can't confirm)
//   no reading / unparseable time -> unknown (couldn't tell)
function deriveStatus(health: HealthResponse | null): BackendStatus {
  if (!health) return "unknown";
  if (!health.healthy) return "offline";
  const updatedMs = Date.parse(health.updated_at);
  if (Number.isNaN(updatedMs)) return "unknown";
  return Date.now() - updatedMs > HEALTH_STALE_MS ? "unknown" : "online";
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`IQM request failed (${res.status}): ${path}`);
  }
  return (await res.json()) as T;
}

// `metrics` is the heavy calibration payload; when omitted (summary phase)
// the metrics-derived fields (fidelities, gate list, qubit map colors) are
// left out and the full fetch fills them in later.
function mapMachine(
  machine: IqmMachine,
  architecture: StaticArchitecture[] | StaticArchitecture,
  metrics: MetricsResponse | undefined,
  status: BackendStatus,
): Backend {
  const arch = Array.isArray(architecture) ? architecture[0] : architecture;
  const valid = (metrics?.observations ?? []).filter(
    (o): o is MetricObservation & { value: number } =>
      !o.invalid && typeof o.value === "number",
  );
  const valuesWhere = (match: (field: string) => boolean): number[] =>
    valid.filter((o) => match(o.dut_field)).map((o) => o.value);

  const { name } = machine;
  const kind =
    machine.type === "Simulator"
      ? "noise-model simulator"
      : "superconducting quantum processor";

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
    if (o.dut_field.includes("metrics.rb.prx.")) {
      const m = o.dut_field.match(/QB\d+/);
      if (m) qubitErrors[m[0]] = Number(((1 - o.value) * 100).toFixed(3));
    }
  }
  const qubitMap = metrics && arch?.qubits
    ? {
        nodes: [
          ...arch.qubits.map((q) => ({ id: q, label: q, error: qubitErrors[q] })),
          ...(arch.computational_resonators ?? []).map((r) => ({
            id: r,
            label: r,
          })),
        ],
        edges: (arch.connectivity ?? []).map(([a, b]) => ({ source: a, target: b })),
        errorLabel: "PRX gate error",
      }
    : undefined;

  return {
    id: `iqm.${machine.alias}`,
    name,
    type: machine.type,
    status,
    qubits: arch?.qubits?.length ?? 0,
    provider: "IQM",
    queueDepth: null,
    details: {
      description: `${name} is a ${kind}, with calibration data pulled live from IQM Resonance.`,
      nativeGates: metrics ? nativeGates : undefined,
      qubitMap,
      medianOneQubitFidelity: asPercent(
        median(valuesWhere((f) => f.includes("metrics.rb.prx."))),
      ),
      medianTwoQubitFidelity: asPercent(
        median(valuesWhere((f) => f.includes("metrics.irb.cz."))),
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
// no architecture, etc.) is dropped rather than failing the whole list.
// `withMetrics` decides whether the heavy calibration payload is included;
// architecture and health stay in both phases because the cards need the
// qubit count and status badge.
async function fetchMachines(withMetrics: boolean): Promise<Backend[]> {
  const settled = await Promise.allSettled(
    IQM_MACHINES.map(async (machine) => {
      // Health only applies to real hardware; simulators are software and
      // always available. Fetch it best-effort so a health failure yields an
      // "unknown" status rather than dropping the whole machine.
      const healthPromise =
        machine.type === "QPU"
          ? getJson<HealthResponse>(
              `/api/iqm/api/v1/quantum-computers/${machine.alias}/health`,
            ).catch(() => null)
          : Promise.resolve<HealthResponse | null>(null);

      const [architecture, metrics, health] = await Promise.all([
        getJson<StaticArchitecture[]>(
          `/api/iqm/api/v1/quantum-computers/${machine.alias}/artifacts/static-quantum-architectures`,
        ),
        withMetrics
          ? getJson<MetricsResponse>(
              `/api/iqm/api/v1/calibration-sets/${machine.alias}/default/metrics`,
            )
          : Promise.resolve(undefined),
        healthPromise,
      ]);

      const status: BackendStatus =
        machine.type === "Simulator" ? "online" : deriveStatus(health);

      return mapMachine(machine, architecture, metrics, status);
    }),
  );

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<Backend> => r.status === "fulfilled",
    )
    .map((r) => r.value);
}

// Light first phase: everything the catalog cards need (name, qubit count,
// live status) without the heavy calibration metrics.
export async function fetchIqmSummaries(): Promise<Backend[]> {
  return fetchMachines(false);
}

// Full second phase: includes calibration (fidelities and qubit map colors).
export async function fetchIqmBackends(): Promise<Backend[]> {
  return fetchMachines(true);
}
