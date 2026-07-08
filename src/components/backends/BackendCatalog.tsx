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
// each fetched independently via React Query. Providers render as they arrive
// instead of blocking the whole grid on the slowest one; providers still in
// flight show trailing skeleton cards. Adding a provider = one more hook +
// spread below.
export default function BackendCatalog() {
  const [selected, setSelected] = useState<Backend | null>(null);
  const { data: iqmBackends = [], isLoading: iqmLoading } = useIqmBackends();
  const { data: rigettiBackends = [], isLoading: rigettiLoading } =
    useRigettiBackends();
  const { data: ibmBackends = [], isLoading: ibmLoading } = useIbmBackends();

  const anyLoading = iqmLoading || rigettiLoading || ibmLoading;
  const pendingProviders = [iqmLoading, rigettiLoading, ibmLoading].filter(
    Boolean,
  ).length;
  const allBackends = [...iqmBackends, ...rigettiBackends, ...ibmBackends];
  const onlineCount = allBackends.filter((b) => b.status === "online").length;

  // Very first paint, before any provider has responded: full skeleton grid.
  if (allBackends.length === 0 && anyLoading) {
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
        {anyLoading ? " (loading more)" : ""}
      </p>
      <BackendGrid
        backends={allBackends}
        onSelect={setSelected}
        pendingCount={anyLoading ? pendingProviders * 2 : 0}
      />

      {selected && (
        <BackendModal backend={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
