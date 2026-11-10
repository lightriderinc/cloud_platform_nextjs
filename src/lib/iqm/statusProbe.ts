import { deriveAvailability } from "@/lib/backends/availability";
import { STATUS_CONFIG } from "@/lib/backends/status/config";
import type { ProbeResult, StatusProbe } from "@/lib/backends/status/poll";
import type {
  Reading,
  ReadingKind,
  StatusMemory,
} from "@/lib/backends/status/types";
import {
  IQM_BASE_URL,
  IQM_MACHINES,
  iqmBackendId,
  type IqmMachine,
} from "@/lib/iqm/machines";
import type { AvailabilityWindow } from "@/types/backend";

// Server-side IQM probe for the status light (server-only). Calls IQM
// directly with IQM_TOKEN, with no proxy cache in the decision path. Per poll:
//
//   GET api/v1/quantum-computers
//       Aliases our token can see. Only used to tell "machine removed from our
//       account" apart from "endpoint moved" when a per-machine call 404s.
//   QPUs:
//   GET api/v1/quantum-computers/{alias}/health
//       `healthy` flag + `updated_at` freshness stamp. Undocumented response
//       (iqm-client types it dict[str, Any]), so it's classified defensively:
//       anything unexpected is a schema_error, never a verdict.
//   GET api/v1/quantum-computers/{alias}/queue-availability
//       Inside an on-demand window right now? (Resonance-only endpoint.)
//   GET api/v1/calibration-sets/{alias}/default/dynamic-quantum-architecture
//       Every STATUS_CONFIG.calibrationIntervalMs: are calibrated gates available?
//   Mocks (no health feed):
//   GET api/v1/quantum-computers/{alias}/artifacts/static-quantum-architectures
//       IQM is serving the simulator at all.

const PROVIDER = "IQM";
const REQUEST_TIMEOUT_MS = 8_000;

type Upstream =
  | { ok: true; status: number; body: unknown; latencyMs: number }
  | { ok: false; status?: number; error: string; latencyMs: number };

async function iqmGet(path: string, token: string): Promise<Upstream> {
  const started = Date.now();
  try {
    const res = await fetch(`${IQM_BASE_URL}/${path}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, status: res.status, error: `HTTP ${res.status}`, latencyMs };
    }
    // A 2xx that isn't JSON yields `undefined`, which the classifiers treat
    // as a schema change.
    const body: unknown = await res.json().catch(() => undefined);
    return { ok: true, status: res.status, body, latencyMs };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    return {
      ok: false,
      error: timedOut ? "timeout" : "network error",
      latencyMs: Date.now() - started,
    };
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const machinePath = (alias: string, rest: string) =>
  `api/v1/quantum-computers/${encodeURIComponent(alias)}/${rest}`;

// A failed call's kind. Only 401/403 blame our credential, and only a 404 for
// an alias missing from a successful listing means the machine is gone; a 404
// for a listed alias (or with no listing) means the endpoint moved.
function failureKind(
  result: Extract<Upstream, { ok: false }>,
  alias: string,
  listing: Set<string> | null,
): ReadingKind {
  const { status } = result;
  if (status === 401 || status === 403) return "auth_error";
  if (status === 404) {
    return listing && !listing.has(alias) ? "not_listed" : "schema_error";
  }
  if (status === undefined || status === 408 || status === 429 || status >= 500) {
    return "transport_error";
  }
  return "schema_error";
}

function failedReading(
  result: Extract<Upstream, { ok: false }>,
  alias: string,
  listing: Set<string> | null,
): Pick<Reading, "kind" | "detail" | "httpStatus" | "latencyMs"> {
  return {
    kind: failureKind(result, alias, listing),
    detail: result.error,
    httpStatus: result.status,
    latencyMs: result.latencyMs,
  };
}

function classifyHealth(
  body: unknown,
): Pick<Reading, "kind" | "healthStamp" | "detail"> {
  if (!isRecord(body) || typeof body.healthy !== "boolean") {
    return { kind: "schema_error", detail: "health response has no boolean `healthy`" };
  }
  const stamp = typeof body.updated_at === "string" ? body.updated_at : null;
  if (!body.healthy) return { kind: "unhealthy", healthStamp: stamp };
  // Freshness is the whole point of the health feed; without a usable stamp
  // a healthy flag can't be trusted as current.
  if (stamp === null || !Number.isFinite(Date.parse(stamp))) {
    return { kind: "schema_error", detail: "health response has no parseable `updated_at`" };
  }
  return { kind: "healthy", healthStamp: stamp };
}

const isWindow = (value: unknown): value is AvailabilityWindow =>
  isRecord(value) && typeof value.start === "string" && typeof value.end === "string";

function readAcceptingJobs(result: Upstream): boolean | null {
  if (!result.ok || !isRecord(result.body) || !Array.isArray(result.body.available)) {
    return null;
  }
  const windows = result.body.available.filter(isWindow);
  return deriveAvailability(windows, false)?.availableNow ?? null;
}

function readCalibration(result: Upstream): NonNullable<Reading["calibration"]> {
  if (!result.ok || !isRecord(result.body) || !isRecord(result.body.gates)) {
    return { ok: null, calibrationSetId: null };
  }
  const id = result.body.calibration_set_id;
  return {
    ok: Object.keys(result.body.gates).length > 0,
    calibrationSetId: typeof id === "string" ? id : null,
  };
}

function calibrationDue(memory: StatusMemory | undefined, now: number): boolean {
  const last = memory?.calibrationCheckedAt;
  return last == null || now - last >= STATUS_CONFIG.calibrationIntervalMs;
}

async function probeQpu(
  machine: IqmMachine,
  token: string,
  listing: Set<string> | null,
  checkCalibration: boolean,
): Promise<Reading> {
  const { alias } = machine;
  const [health, queue, calibration] = await Promise.all([
    iqmGet(machinePath(alias, "health"), token),
    iqmGet(machinePath(alias, "queue-availability"), token),
    checkCalibration
      ? iqmGet(
          `api/v1/calibration-sets/${encodeURIComponent(alias)}/default/dynamic-quantum-architecture`,
          token,
        )
      : Promise.resolve(null),
  ]);

  const base: Reading = {
    kind: "transport_error",
    provider: PROVIDER,
    at: Date.now(),
    acceptingJobs: readAcceptingJobs(queue),
    calibration: calibration ? readCalibration(calibration) : undefined,
  };

  if (!health.ok) return { ...base, ...failedReading(health, alias, listing) };
  return {
    ...base,
    ...classifyHealth(health.body),
    httpStatus: health.status,
    latencyMs: health.latencyMs,
    raw: health.body,
  };
}

async function probeSimulator(
  machine: IqmMachine,
  token: string,
  listing: Set<string> | null,
): Promise<Reading> {
  const { alias } = machine;
  const result = await iqmGet(
    machinePath(alias, "artifacts/static-quantum-architectures"),
    token,
  );
  const base: Reading = { kind: "transport_error", provider: PROVIDER, at: Date.now() };

  if (!result.ok) return { ...base, ...failedReading(result, alias, listing) };
  const served = Array.isArray(result.body) || isRecord(result.body);
  return {
    ...base,
    kind: served ? "healthy" : "schema_error",
    detail: served ? "simulator architecture served" : "unexpected architecture response",
    httpStatus: result.status,
    latencyMs: result.latencyMs,
  };
}

async function fetchListing(token: string): Promise<Set<string> | null> {
  const result = await iqmGet("api/v1/quantum-computers", token);
  if (!result.ok || !isRecord(result.body) || !Array.isArray(result.body.quantum_computers)) {
    return null;
  }
  const aliases = result.body.quantum_computers
    .map((qc) => (isRecord(qc) && typeof qc.alias === "string" ? qc.alias : null))
    .filter((alias): alias is string => alias !== null);
  return new Set(aliases);
}

async function run(
  memories: ReadonlyMap<string, StatusMemory>,
): Promise<ProbeResult[]> {
  const token = process.env.IQM_TOKEN;
  if (!token) {
    const at = Date.now();
    return IQM_MACHINES.map((machine) => ({
      backendId: iqmBackendId(machine.alias),
      reading: {
        kind: "auth_error",
        provider: PROVIDER,
        at,
        detail: "IQM_TOKEN is not configured",
      },
    }));
  }

  const listing = await fetchListing(token);
  const now = Date.now();

  return Promise.all(
    IQM_MACHINES.map(async (machine) => {
      const backendId = iqmBackendId(machine.alias);
      const reading =
        machine.type === "QPU"
          ? await probeQpu(
              machine,
              token,
              listing,
              calibrationDue(memories.get(backendId), now),
            )
          : await probeSimulator(machine, token, listing);
      return { backendId, reading };
    }),
  );
}

export const iqmStatusProbe: StatusProbe = {
  provider: PROVIDER,
  backendIds: IQM_MACHINES.map((machine) => iqmBackendId(machine.alias)),
  run,
};
