"use client";

import { useIqmBackends } from "@/hooks/useIqmBackends";
import { useRigettiBackends } from "@/hooks/useRigettiBackends";
import type { Backend } from "@/types/backend";
import { useState } from "react";
import BackendGrid from "./BackendGrid";
import BackendModal from "./BackendModal";

// Owns selection state and merges live provider machines (IQM, Rigetti),
// fetched via React Query through their proxies, ahead of the static
// placeholder catalog. Adding a provider = one more hook + spread below.

// export default function BackendCatalog({ backends }: { backends: Backend[] }) {

export default function BackendCatalog() {
  const [selected, setSelected] = useState<Backend | null>(null);
  const { data: iqmBackends = [], isLoading: iqmLoading } = useIqmBackends();
  const { data: rigettiBackends = [], isLoading: rigettiLoading } = useRigettiBackends();

  const isLoading = iqmLoading || rigettiLoading;
  const allBackends = [...iqmBackends, ...rigettiBackends];
  const onlineCount = allBackends.filter((b) => b.status === "online").length;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex h-full animate-pulse flex-col gap-3 default-radius border border-gray-200 bg-gray-100 p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="h-4 w-32 rounded bg-gray-300" />
              <div className="h-5 w-14 rounded-full bg-gray-300" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-24 rounded bg-gray-300" />
              <div className="h-3.5 w-20 rounded bg-gray-300" />
            </div>
            <div className="mt-auto h-5 w-16 rounded bg-gray-300" />
          </div>
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

      {selected && (
        <BackendModal backend={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
