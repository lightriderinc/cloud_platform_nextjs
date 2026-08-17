import { getQuantumBackendId } from "@/lib/quantum/backends";
import { isReservationCatalogId } from "@/lib/quantum/reservations";
import type { Backend } from "@/types/backend";

export type FilterCategory = "provider" | "type" | "access";
export type AccessValue = "available" | "comingSoon";

// Every category is a Set<string> — narrowing "type" to BackendType or
// "access" to AccessValue would require a cast anywhere code is generic
// over FilterCategory (toggling, clearing), for no real safety benefit
// since values only ever originate from this module's own option lists.
export interface BackendFilterState {
  provider: Set<string>;
  type: Set<string>;
  access: Set<string>;
}

export function createEmptyFilters(): BackendFilterState {
  return { provider: new Set(), type: new Set(), access: new Set() };
}

export function backendAccess(backend: Backend): AccessValue {
  if (isReservationCatalogId(backend.id)) return "available";
  return getQuantumBackendId(backend.id) === null ? "comingSoon" : "available";
}

export function filterBackends(backends: Backend[], filters: BackendFilterState): Backend[] {
  return backends.filter((backend) => {
    if (filters.provider.size > 0 && !filters.provider.has(backend.provider)) return false;
    if (filters.type.size > 0 && !filters.type.has(backend.type)) return false;
    if (filters.access.size > 0 && !filters.access.has(backendAccess(backend))) return false;
    return true;
  });
}

export function countActiveFilters(filters: BackendFilterState): number {
  return filters.provider.size + filters.type.size + filters.access.size;
}
