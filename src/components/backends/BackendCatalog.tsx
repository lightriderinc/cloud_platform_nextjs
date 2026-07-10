"use client";

import { useIbmBackends } from "@/hooks/useIbmBackends";
import { useIqmBackends } from "@/hooks/useIqmBackends";
import { useRigettiBackends } from "@/hooks/useRigettiBackends";
import type { Backend } from "@/types/backend";
import { useState } from "react";
import BackendCardSkeleton from "./BackendCardSkeleton";
import BackendGrid from "./BackendGrid";
import BackendModal from "./BackendModal";

// Owns selection state and merges live provider machines (IQM, Rigetti, IBM),
// each fetched independently via React Query. The grid shows skeletons until
// every provider's card data has arrived, then all cards appear together;
// heavy details (fidelities, qubit map) keep streaming in behind the scenes
// afterwards. Adding a provider = one more hook + spread below.
export default function BackendCatalog() {
  const [selected, setSelected] = useState<Backend | null>(null);
  const { data: iqmBackends = [], isLoading: iqmLoading } = useIqmBackends();
  const { data: rigettiBackends = [], isLoading: rigettiLoading } =
    useRigettiBackends();
  const { data: ibmBackends = [], isLoading: ibmLoading } = useIbmBackends();

  const anyLoading = iqmLoading || rigettiLoading || ibmLoading;
  const allBackends = [...iqmBackends, ...rigettiBackends, ...ibmBackends];
  const onlineCount = allBackends.filter((b) => b.status === "online").length;

  // Skeleton grid until every provider's cards are ready, so the catalog
  // appears in one piece instead of provider by provider.
  if (anyLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <BackendCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      <p className="mb-6 text-md text-gray-950">
        {allBackends.length} Backends, {onlineCount} Online
      </p>
      <BackendGrid backends={allBackends} onSelect={setSelected} />

      {/* Render the freshest copy of the selection so the modal upgrades in
          place when a provider's heavy details (qubit map, fidelities) finish
          loading after the card was clicked. */}
      {selected && (
        <BackendModal
          backend={allBackends.find((b) => b.id === selected.id) ?? selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
