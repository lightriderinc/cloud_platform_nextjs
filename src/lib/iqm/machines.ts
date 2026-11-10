import type { BackendType } from "@/types/backend";

// The IQM machines Light Rider exposes. Shared by the browser catalog client
// (lib/iqm/client.ts) and the server-side status probe (lib/iqm/statusProbe.ts)
// so both always agree on which machines exist.
//
// The list is intentionally hardcoded (not auto-discovered) so IQM adding or
// experimenting with backends never surfaces unexpected cards on our frontend.
// `alias` is the IQM identifier used in API paths (mock aliases include a colon,
// e.g. "garnet:mock", which gets URL-encoded in request paths).

export interface IqmMachine {
  alias: string;
  name: string;
  type: BackendType;
}

export const IQM_MACHINES: IqmMachine[] = [
  { alias: "garnet", name: "IQM Garnet", type: "QPU" },
  { alias: "emerald", name: "IQM Emerald", type: "QPU" },
  { alias: "sirius", name: "IQM Sirius", type: "QPU" },
  { alias: "garnet:mock", name: "IQM Garnet (mock)", type: "Simulator" },
  { alias: "emerald:mock", name: "IQM Emerald (mock)", type: "Simulator" },
  { alias: "sirius:mock", name: "IQM Sirius (mock)", type: "Simulator" },
];

/** IQM Resonance (IQM Server REST API) origin; endpoints live under `api/v1/`. */
export const IQM_BASE_URL = "https://resonance.iqm.tech";

/** Catalog `Backend.id` for an IQM machine, e.g. "iqm.garnet" or "iqm.garnet:mock". */
export function iqmBackendId(alias: string): string {
  return `iqm.${alias}`;
}
