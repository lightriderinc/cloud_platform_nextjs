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
      <div className="default-radius border border-dashed border-gray-300 p-16 text-center text-sm text-gray-500">
        Loading backends…
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
