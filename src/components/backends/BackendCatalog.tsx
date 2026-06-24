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
  const { data: iqmBackends = [] } = useIqmBackends();
  const { data: rigettiBackends = [] } = useRigettiBackends();

  const allBackends = [...iqmBackends, ...rigettiBackends];
  const onlineCount = allBackends.filter((b) => b.status === "online").length;

  return (
    <>
      <p className="mb-6 text-md text-gray-950">
        {allBackends.length} Backends, {onlineCount} Online
      </p>
      <h2 className="mb-4 text-lg font-semibold">Available QPUs</h2>
      <BackendGrid backends={allBackends} onSelect={setSelected} />

      {selected && (
        <BackendModal backend={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
