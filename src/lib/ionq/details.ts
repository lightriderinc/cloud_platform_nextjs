// Full details for one IonQ device, as qpu-proxy's
// GET /backends/ionq/{device}/details returns them (passed through unchanged
// by /api/ionq/details). Used by the backend detail modal; the catalog cards
// stay on the lighter /api/ionq/status listing.
//
// Units as qpu-proxy sends them: errors and fidelities are fractions
// (0.0041 = 0.41%), timings are in seconds, average_queue_time_ms in ms.

/** The qpu-proxy device instances that have a details page. */
export const IONQ_DETAIL_DEVICES = ["ionq:mock", "forte-1:mock", "forte-1", "forte-enterprise-1"] as const;
export type IonqDetailDevice = (typeof IONQ_DETAIL_DEVICES)[number];

export function isIonqDetailDevice(value: string | null | undefined): value is IonqDetailDevice {
  return (IONQ_DETAIL_DEVICES as readonly string[]).includes(value ?? "");
}

/** Catalog card id ("ionq.forte-1") to qpu-proxy device ("forte-1"), or null for non-IonQ cards. */
export function ionqDeviceFromCatalogId(id: string): IonqDetailDevice | null {
  if (!id.startsWith("ionq.")) return null;
  const device = id.slice("ionq.".length);
  return isIonqDetailDevice(device) ? device : null;
}

export interface IonqCharacterization {
  id?: string | null;
  /** ISO string or epoch (seconds or ms), as IonQ reports it. */
  date?: string | number | null;
  topology?: [number, number][] | null;
  median_error?: { "1q"?: number | null; "2q"?: number | null; spam?: number | null } | null;
  median_fidelity?: { "1q"?: number | null; "2q"?: number | null; spam?: number | null } | null;
  timing_s?: {
    t1?: number | null;
    t2?: number | null;
    "1q"?: number | null;
    "2q"?: number | null;
    readout?: number | null;
    reset?: number | null;
  } | null;
}

export interface IonqDeviceDetails {
  device_instance: string;
  backend?: string | null;
  kind?: "qpu" | "simulator" | string | null;
  qubits?: number | null;
  status?: string | null;
  degraded?: boolean | null;
  average_queue_time_ms?: number | null;
  last_updated?: string | number | null;
  /** Simulators only. */
  noise_model?: string | null;
  description?: string | null;
  /** Null for simulators. */
  characterization?: IonqCharacterization | null;
  capabilities?: {
    supported_gates?: unknown[] | null;
    supported_native_gates?: unknown[] | null;
    supported_error_mitigations?: unknown[] | null;
  } | null;
  /** IonQ's original JSON, offered as Copy/Download JSON. */
  raw?: unknown;
}

/** Client side: the modal's query. Throws on any failure so the modal can show "Details unavailable". */
export async function fetchIonqDetails(device: IonqDetailDevice): Promise<IonqDeviceDetails> {
  const res = await fetch(`/api/ionq/details?device=${encodeURIComponent(device)}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`IonQ details unavailable (HTTP ${res.status})`);
  const body = (await res.json()) as IonqDeviceDetails;
  if (!body || typeof body !== "object" || typeof body.device_instance !== "string") {
    throw new Error("IonQ details response had an unexpected shape");
  }
  return body;
}

// --- Formatting for the modal -------------------------------------------

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * "all-to-all" when every pair of the device's qubits is connected (IonQ's
 * trapped-ion systems), otherwise "N connections". The pairs themselves are
 * never listed: on a 36-qubit Forte that is 630 of them.
 */
export function formatTopology(topology: [number, number][] | null | undefined, qubits: number | null | undefined): string | null {
  if (!Array.isArray(topology) || topology.length === 0) return null;
  const pairs = new Set<string>();
  for (const pair of topology) {
    if (!Array.isArray(pair) || pair.length !== 2) continue;
    const [a, b] = pair;
    if (!isNum(a) || !isNum(b) || a === b) continue;
    pairs.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  }
  if (isNum(qubits) && qubits > 1) {
    let complete = true;
    for (let i = 0; i < qubits && complete; i++) {
      for (let j = i + 1; j < qubits; j++) {
        if (!pairs.has(`${i}-${j}`)) {
          complete = false;
          break;
        }
      }
    }
    if (complete) return "all-to-all";
  }
  return `${pairs.size} ${pairs.size === 1 ? "connection" : "connections"}`;
}

/** A fraction as a percent with three decimals: 0.0001 gives "0.010%", 0.0041 gives "0.410%". */
export function formatErrorPercent(fraction: number | null | undefined): string | null {
  if (!isNum(fraction)) return null;
  return `${(fraction * 100).toFixed(3)}%`;
}

/** Seconds, three significant figures: 1.5 gives "1.5 s". */
export function formatSeconds(seconds: number | null | undefined): string | null {
  if (!isNum(seconds)) return null;
  return `${Number(seconds.toPrecision(3))} s`;
}

/** Seconds shown in microseconds, three significant figures: 0.00013 gives "130 µs". */
export function formatMicroseconds(seconds: number | null | undefined): string | null {
  if (!isNum(seconds)) return null;
  return `${Number((seconds * 1e6).toPrecision(3))} µs`;
}

/** IonQ's characterization date (ISO string, or epoch in seconds or ms) as a Date, or null. */
export function parseCharacterizationDate(date: string | number | null | undefined): Date | null {
  if (date === null || date === undefined || date === "") return null;
  let parsed: Date;
  if (isNum(date)) {
    parsed = new Date(date < 1e12 ? date * 1000 : date);
  } else if (/^\d+(\.\d+)?$/.test(date)) {
    const n = Number(date);
    parsed = new Date(n < 1e12 ? n * 1000 : n);
  } else {
    parsed = new Date(date);
  }
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** A capabilities list as display text; null when empty, so the row is hidden. */
export function formatCapabilityList(items: unknown[] | null | undefined): string | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const text = items
    .map((item) => (typeof item === "string" ? item : item === null || item === undefined ? "" : JSON.stringify(item)))
    .filter((s) => s !== "");
  return text.length > 0 ? text.join(", ") : null;
}

/** IonQ's status string in plain words for the modal's Status row. */
export function formatIonqStatus(status: string | null | undefined, degraded: boolean | null | undefined): string | null {
  if (!status) return null;
  if (status === "available") return degraded ? "Degraded" : "Available";
  if (status === "unavailable") return "Unavailable";
  if (status === "retired") return "Retired";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** A download filename for the raw JSON; colons are not allowed in Windows filenames. */
export function ionqDetailsFilename(device: string): string {
  return `ionq-${device.replace(/[^a-z0-9.-]+/gi, "-")}-details.json`;
}
