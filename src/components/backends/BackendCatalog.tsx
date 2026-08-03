"use client";

import { useIbmBackends } from "@/hooks/useIbmBackends";
import { useIqmBackends } from "@/hooks/useIqmBackends";
import { useRigettiBackends } from "@/hooks/useRigettiBackends";
import { sortBackends, type BackendSortKey } from "@/lib/backends/sort";
import type { Backend } from "@/types/backend";
import { useState } from "react";
import { MdGridView, MdViewList } from "react-icons/md";
import BackendCardSkeleton from "./BackendCardSkeleton";
import BackendGrid from "./BackendGrid";
import BackendList from "./BackendList";
import BackendModal from "./BackendModal";
import BackendRowSkeleton from "./BackendRowSkeleton";
import BackendSortMenu from "./BackendSortMenu";

type View = "cards" | "list";

const viewButtonBase =
  "flex h-8 w-8 items-center justify-center default-radius text-lg transition-colors cursor-pointer";
const viewButtonOn = "bg-gray-700 text-white";
const viewButtonOff = "text-gray-500 hover:bg-gray-100";

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
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { data: iqmBackends = [], isLoading: iqmLoading } = useIqmBackends();
  const { data: rigettiBackends = [], isLoading: rigettiLoading } =
    useRigettiBackends();
  const { data: ibmBackends = [], isLoading: ibmLoading } = useIbmBackends();

  const anyLoading = iqmLoading || rigettiLoading || ibmLoading;
  const allBackends = [...iqmBackends, ...rigettiBackends, ...ibmBackends];
  const onlineCount = allBackends.filter((b) => b.status === "online").length;
  const sortedBackends = sortBackends(allBackends, sortKey, sortDirection);

  // Column-header clicks (list view) and sort menu rows (card view) share
  // this: picking a new field starts ascending, re-picking the active one
  // flips direction.
  function handleSort(key: BackendSortKey) {
    if (key === sortKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
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
          {allBackends.length} Backends, {onlineCount} Online
        </p>
        <div className="flex items-center gap-3">
          {view === "cards" && (
            <BackendSortMenu
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          )}

          <div className="flex items-center gap-1 default-radius border border-gray-100 p-1">
            <button
              type="button"
              aria-label="Card view"
              aria-pressed={view === "cards"}
              onClick={() => setView("cards")}
              className={[viewButtonBase, view === "cards" ? viewButtonOn : viewButtonOff].join(" ")}
            >
              <MdGridView />
            </button>
            <button
              type="button"
              aria-label="List view"
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
              className={[viewButtonBase, view === "list" ? viewButtonOn : viewButtonOff].join(" ")}
            >
              <MdViewList />
            </button>
          </div>
        </div>
      </div>

      {view === "list" ? (
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
      {selected && (
        <BackendModal
          backend={allBackends.find((b) => b.id === selected.id) ?? selected}
          onClose={() => setSelected(null)}
          isAuthenticated={isAuthenticated}
        />
      )}
    </>
  );
}
