import type { Backend } from "@/types/backend";

export type BackendSortKey = "provider" | "qubits" | "type";
export type SortDirection = "asc" | "desc";

const COMPARATORS: Record<BackendSortKey, (a: Backend, b: Backend) => number> = {
  provider: (a, b) => a.provider.localeCompare(b.provider),
  qubits: (a, b) => a.qubits - b.qubits,
  type: (a, b) => a.type.localeCompare(b.type),
};

export function sortBackends(
  backends: Backend[],
  key: BackendSortKey,
  direction: SortDirection,
): Backend[] {
  const sorted = [...backends].sort(COMPARATORS[key]);
  return direction === "desc" ? sorted.reverse() : sorted;
}
