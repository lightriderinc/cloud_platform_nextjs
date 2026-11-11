import type { Backend, BackendStatus, BackendStatusInfo, BackendType } from "@/types/backend";

// IonQ catalog cards. The device list is hardcoded like IQM and Rigetti
// (project convention: no auto-discovery): the four devices qpu-proxy's IonQ
// adapter serves. Live status comes from /api/ionq/status (IonQ's own
// backend listing via qpu-proxy /healthz), so a Forte in maintenance shows
// as unavailable.
//
// IonQ is trapped-ion with all-to-all connectivity: no chiplets, no lattice,
// so the cards carry no qubitMap and the detail modal shows none.

/** One qpu-proxy IonQ device: `ionqBackend` is the key it reports under in IonQ's listing. */
interface IonqDevice {
  device: string;
  ionqBackend: string;
  name: string;
  type: BackendType;
  qubits: number;
  description: string;
}

const IONQ_DEVICES: IonqDevice[] = [
  {
    device: "ionq:mock",
    ionqBackend: "simulator",
    name: "IonQ Simulator",
    type: "Simulator",
    qubits: 29,
    description: "IonQ's cloud simulator, noiseless. Free and unlimited.",
  },
  {
    device: "forte-1:mock",
    ionqBackend: "simulator",
    name: "IonQ Forte-1 (simulator)",
    type: "Simulator",
    qubits: 29,
    description: "IonQ's cloud simulator with the Forte-1 noise model. Free and unlimited.",
  },
  {
    device: "forte-1",
    ionqBackend: "qpu.forte-1",
    name: "IonQ Forte-1",
    type: "QPU",
    qubits: 36,
    description:
      "IonQ Forte-1 is a trapped-ion quantum computer with all-to-all connectivity. Priced per job: you see the price in credits before you submit.",
  },
  {
    device: "forte-enterprise-1",
    ionqBackend: "qpu.forte-enterprise-1",
    name: "IonQ Forte Enterprise-1",
    type: "QPU",
    qubits: 36,
    description:
      "IonQ Forte Enterprise-1 is a trapped-ion quantum computer with all-to-all connectivity. Priced per job: you see the price in credits before you submit.",
  },
];

/** One entry of IonQ's GET /backends, as qpu-proxy passes it on. average_queue_time is in milliseconds (IonQ API v0.4). */
export interface IonqBackendStatus {
  status?: string;
  degraded?: boolean;
  qubits?: number;
  average_queue_time?: number;
  last_updated?: unknown;
}

/** What /api/ionq/status returns: qpu-proxy's backends.ionq section. */
export interface IonqStatusResponse {
  ok?: boolean;
  backends?: Record<string, IonqBackendStatus>;
  error?: string;
}

function liveStatus(entry: IonqBackendStatus | undefined): { status: BackendStatus; statusInfo?: BackendStatusInfo } {
  if (!entry) {
    return { status: "unknown", statusInfo: { reason: "Live status from IonQ isn't available right now." } };
  }
  switch (entry.status) {
    case "available":
      return entry.degraded
        ? {
            status: "online",
            statusInfo: { label: "Degraded", reason: "IonQ reports this system as degraded, so jobs may run slower than usual." },
          }
        : { status: "online" };
    case "unavailable":
      return {
        status: "maintenance",
        statusInfo: { label: "Unavailable", reason: "IonQ reports this system as unavailable, for example during maintenance." },
      };
    case "retired":
      return { status: "offline", statusInfo: { label: "Retired", reason: "IonQ has retired this system." } };
    default:
      return { status: "unknown", statusInfo: { reason: `IonQ reports the status "${entry.status ?? "none"}".` } };
  }
}

/** Builds the four IonQ cards from a status response; null (fetch failed) gives every card an "unknown" status rather than dropping it. */
export function mapIonqBackends(response: IonqStatusResponse | null): Backend[] {
  const listing = response?.ok ? response.backends : undefined;
  return IONQ_DEVICES.map((d) => {
    const entry = listing?.[d.ionqBackend];
    const { status, statusInfo } = liveStatus(entry);
    const queueTime = entry?.average_queue_time;
    return {
      id: `ionq.${d.device}`,
      name: d.name,
      type: d.type,
      status,
      ...(statusInfo ? { statusInfo } : {}),
      qubits: d.qubits,
      provider: "IonQ",
      queueDepth: null,
      queueTimeMs: typeof queueTime === "number" && queueTime >= 0 ? queueTime : null,
      availability: { availableNow: status === "online", nextWindowStart: null },
      details: { description: d.description, topology: "All-to-all connectivity" },
    };
  });
}

export async function fetchIonqBackends(): Promise<Backend[]> {
  try {
    const res = await fetch("/api/ionq/status", { headers: { Accept: "application/json" } });
    return mapIonqBackends(res.ok ? ((await res.json()) as IonqStatusResponse) : null);
  } catch {
    return mapIonqBackends(null);
  }
}
