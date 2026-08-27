import { backendAccess } from "@/lib/backends/filters";
import type { Backend } from "@/types/backend";

export type BackendSortKey = "provider" | "qubits" | "type";
export type SortDirection = "asc" | "desc";

const COMPARATORS: Record<BackendSortKey, (a: Backend, b: Backend) => number> = {
  provider: (a, b) => a.provider.localeCompare(b.provider),
  qubits: (a, b) => a.qubits - b.qubits,
  type: (a, b) => a.type.localeCompare(b.type),
};

// When the primary key ties (e.g. a QPU and its simulator counterpart share
// the same qubit count), the QPU wins the tie-break — kept as a comparator
// term rather than a post-sort .reverse() so flipping `direction` negates the
// primary key only, not this tie-break.
function compareWithTypeTiebreak(
  key: BackendSortKey,
  direction: SortDirection,
): (a: Backend, b: Backend) => number {
  const sign = direction === "desc" ? -1 : 1;
  return (a, b) => {
    const primary = COMPARATORS[key](a, b) * sign;
    if (primary !== 0) return primary;
    if (a.type !== b.type) return a.type === "QPU" ? -1 : 1;
    return 0;
  };
}

// Coming-soon backends always sink to the bottom, independent of sort key or
// direction — they're not real options yet, so they shouldn't compete for
// the top spots a qubit-count or name sort would otherwise give them.
export function sortBackends(
  backends: Backend[],
  key: BackendSortKey,
  direction: SortDirection,
): Backend[] {
  const available = backends.filter((b) => backendAccess(b) === "available");
  const comingSoon = backends.filter((b) => backendAccess(b) === "comingSoon");
  const comparator = compareWithTypeTiebreak(key, direction);
  return [
    [...available].sort(comparator),
    [...comingSoon].sort(comparator),
  ].flat();
}
