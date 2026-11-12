import type { Backend } from "@/types/backend";

// The /backends catalog's two tabs, as on IonQ Cloud. Split by each
// backend's existing `type`, never by its tag label (IonQ's Forte noise
// simulator is labelled "Cloud" but is still a simulator).

export type BackendTab = "qpus" | "simulators";

export const BACKEND_TABS: { id: BackendTab; label: string }[] = [
  { id: "qpus", label: "QPUs" },
  { id: "simulators", label: "Simulators" },
];

export function isBackendTab(value: string | null | undefined): value is BackendTab {
  return value === "qpus" || value === "simulators";
}

export function backendTab(backend: Pick<Backend, "type">): BackendTab {
  return backend.type === "Simulator" ? "simulators" : "qpus";
}

export function countByTab(backends: Pick<Backend, "type">[]): Record<BackendTab, number> {
  const counts: Record<BackendTab, number> = { qpus: 0, simulators: 0 };
  for (const b of backends) counts[backendTab(b)]++;
  return counts;
}
