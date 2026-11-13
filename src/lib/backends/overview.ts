import { backendAccess } from "@/lib/backends/filters";
import type { Backend } from "@/types/backend";

// Numbers for the stat cards at the top of the /backends page, computed from
// the same merged backend list the cards render, so they always match it.

export interface BackendStats {
  total: number;
  qpus: number;
  simulators: number;
  online: number;
}

/** Online means the card's own status is "online" and the backend can be used today (not "Coming soon"). */
export function isOnlineNow(backend: Backend): boolean {
  return backend.status === "online" && backendAccess(backend) === "available";
}

export function backendStats(backends: Backend[]): BackendStats {
  let qpus = 0;
  let simulators = 0;
  let online = 0;
  for (const b of backends) {
    if (b.type === "Simulator") simulators++;
    else qpus++;
    if (isOnlineNow(b)) online++;
  }
  return { total: backends.length, qpus, simulators, online };
}
