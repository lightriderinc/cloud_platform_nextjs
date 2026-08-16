"use client";

import { useIbmBackends } from "@/hooks/useIbmBackends";
import { useIqmBackends } from "@/hooks/useIqmBackends";
import { useRigettiBackends } from "@/hooks/useRigettiBackends";
import {
  createEmptyFilters,
  filterBackends,
  type BackendFilterState,
  type FilterCategory,
} from "@/lib/backends/filters";
import {
  sortBackends,
  type BackendSortKey,
  type SortDirection,
} from "@/lib/backends/sort";
import {
  isReservationCatalogId,
  RESERVED_CEPHEUS_BACKEND_CARD,
} from "@/lib/quantum/reservations";
import ReservationBackendModal from "@/components/reservations/ReservationBackendModal";
import type { Backend } from "@/types/backend";
import { useEffect, useState } from "react";
import { MdGridView, MdViewList } from "react-icons/md";
import BackendCardSkeleton from "./BackendCardSkeleton";
import BackendFilterBar from "./BackendFilterBar";
import BackendGrid from "./BackendGrid";
import BackendList from "./BackendList";
import BackendModal from "./BackendModal";
import BackendRowSkeleton from "./BackendRowSkeleton";
import BackendSortMenu from "./BackendSortMenu";
import type { FilterOption } from "./FilterSection";

type View = "cards" | "list";

const viewButtonBase =
  "flex h-8 w-8 items-center justify-center default-radius text-lg transition-colors cursor-pointer";
const viewButtonOn = "bg-gray-700 text-white";
const viewButtonOff = "text-gray-500 hover:bg-gray-100";

// sessionStorage-backed (not localStorage) so the choice survives navigating
// between pages and back within the tab, but doesn't stick around forever.
const VIEW_KEY = "lr:backends:view";
const SORT_KEY_KEY = "lr:backends:sort-key";
const SORT_DIRECTION_KEY = "lr:backends:sort-direction";

function isView(value: string | null): value is View {
  return value === "cards" || value === "list";
}
function isSortKey(value: string | null): value is BackendSortKey {
  return value === "provider" || value === "qubits" || value === "type";
}
function isSortDirection(value: string | null): value is SortDirection {
  return value === "asc" || value === "desc";
}

// Owns selection state and merges live provider machines (IQM, Rigetti, IBM),
// each fetched independently via React Query. The grid shows skeletons until
// every provider's card data has arrived, then all cards appear together;
// heavy details (fidelities, qubit map) keep streaming in behind the scenes
// afterwards. Adding a provider = one more hook + spread below.
export default function BackendCatalog({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  const [selected, setSelected] = useState<Backend | null>(null);
  const [view, setView] = useState<View>("cards");
  const [sortKey, setSortKey] = useState<BackendSortKey>("qubits");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filters, setFilters] =
    useState<BackendFilterState>(createEmptyFilters);

  // Restore the previous choice after mount (not in the initializer) so the
  // server-rendered markup and first client render still match. Persisting
  // back only happens at the point of user interaction (changeView,
  // handleSort below) — a reactive write-on-change effect would fire during
  // this same restore and stomp the just-restored value with the stale
  // pre-restore state, since its closure predates the setState above.
  useEffect(() => {
    const storedView = sessionStorage.getItem(VIEW_KEY);
    const storedSortKey = sessionStorage.getItem(SORT_KEY_KEY);
    const storedSortDirection = sessionStorage.getItem(SORT_DIRECTION_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isView(storedView)) setView(storedView);
    if (isSortKey(storedSortKey)) setSortKey(storedSortKey);
    if (isSortDirection(storedSortDirection))
      setSortDirection(storedSortDirection);
  }, []);

  function changeView(next: View) {
    setView(next);
    sessionStorage.setItem(VIEW_KEY, next);
  }

  const { data: iqmBackends = [], isLoading: iqmLoading } = useIqmBackends();
  const { data: rigettiBackends = [], isLoading: rigettiLoading } =
    useRigettiBackends();
  const { data: ibmBackends = [], isLoading: ibmLoading } = useIbmBackends();

  const anyLoading = iqmLoading || rigettiLoading || ibmLoading;
  // RESERVED_CEPHEUS_BACKEND_CARD is a synthetic, UI-only entry for the same
  // physical device as the real "rigetti.qpu.Cepheus-1-108Q" card above —
  // temporary, alongside it, until one of the two access models ships (see
  // the reservation-vs-on-demand branch in the modal render below).
  const allBackends = [
    ...iqmBackends,
    ...rigettiBackends,
    RESERVED_CEPHEUS_BACKEND_CARD,
    ...ibmBackends,
  ];
  const providerOptions: FilterOption[] = Array.from(
    new Set(allBackends.map((b) => b.provider)),
  )
    .sort((a, b) => a.localeCompare(b))
    .map((provider) => ({ value: provider, label: provider }));
  const filteredBackends = filterBackends(allBackends, filters);
  const onlineCount = filteredBackends.filter(
    (b) => b.status === "online",
  ).length;
  const sortedBackends = sortBackends(filteredBackends, sortKey, sortDirection);

  // Column-header clicks (list view) and sort menu rows (card view) share
  // this: picking a new field starts ascending, re-picking the active one
  // flips direction.
  function handleSort(key: BackendSortKey) {
    const nextDirection: SortDirection =
      key === sortKey ? (sortDirection === "asc" ? "desc" : "asc") : "asc";
    setSortKey(key);
    setSortDirection(nextDirection);
    sessionStorage.setItem(SORT_KEY_KEY, key);
    sessionStorage.setItem(SORT_DIRECTION_KEY, nextDirection);
  }

  function handleFilterToggle(category: FilterCategory, value: string) {
    setFilters((prev) => {
      const values = new Set(prev[category]);
      if (values.has(value)) {
        values.delete(value);
      } else {
        values.add(value);
      }
      return { ...prev, [category]: values };
    });
  }

  function handleClearFilterCategory(category: FilterCategory) {
    setFilters((prev) => ({ ...prev, [category]: new Set() }));
  }

  function handleClearAllFilters() {
    setFilters(createEmptyFilters());
  }

  // Skeleton grid until every provider's cards are ready, so the catalog
  // appears in one piece instead of provider by provider.
  if (anyLoading) {
    return view === "list" ? (
      <div className="overflow-x-auto default-radius border border-gray-100">
        <table className="w-full text-left text-sm">
          <tbody className="animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <BackendRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <BackendCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-md text-gray-950">
          {filteredBackends.length} Backends, {onlineCount} Online
        </p>

        <div className="flex xl:flex-row flex-col xl:items-center gap-3">
          <div className="flex items-center gap-3">
            {view === "cards" && (
              <BackendSortMenu
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            )}
            <div>
              <BackendFilterBar
                providerOptions={providerOptions}
                filters={filters}
                onToggle={handleFilterToggle}
                onClearCategory={handleClearFilterCategory}
                onClearAll={handleClearAllFilters}
              />
            </div>
          </div>
          <div className="hidden xl:flex items-center gap-1 default-radius border border-gray-100 p-1">
            <button
              type="button"
              aria-label="Card view"
              aria-pressed={view === "cards"}
              onClick={() => changeView("cards")}
              className={[
                viewButtonBase,
                view === "cards" ? viewButtonOn : viewButtonOff,
              ].join(" ")}
            >
              <MdGridView />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => changeView("list")}
              className={[
                viewButtonBase,
                view === "list" ? viewButtonOn : viewButtonOff,
              ].join(" ")}
            >
              <MdViewList />
            </button>
          </div>
        </div>
      </div>

      {filteredBackends.length === 0 ? (
        <div className="default-radius border border-dashed border-gray-200 bg-gray-50 p-16 text-center text-sm text-gray-500">
          No backends match the selected filters.
        </div>
      ) : view === "list" ? (
        <BackendList
          backends={sortedBackends}
          onSelect={setSelected}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
        />
      ) : (
        <BackendGrid backends={sortedBackends} onSelect={setSelected} />
      )}

      {/* Render the freshest copy of the selection so the modal upgrades in
          place when a provider's heavy details (qubit map, fidelities) finish
          loading after the card was clicked. */}
      {selected &&
        (isReservationCatalogId(selected.id) ? (
          <ReservationBackendModal
            backend={allBackends.find((b) => b.id === selected.id) ?? selected}
            onClose={() => setSelected(null)}
          />
        ) : (
          <BackendModal
            backend={allBackends.find((b) => b.id === selected.id) ?? selected}
            onClose={() => setSelected(null)}
            isAuthenticated={isAuthenticated}
          />
        ))}
    </>
  );
}
