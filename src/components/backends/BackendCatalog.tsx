"use client";

import { useState } from "react";
import type { Backend } from "@/types/backend";
import BackendGrid from "./BackendGrid";
import BackendModal from "./BackendModal";
import { useIqmBackends } from "@/hooks/useIqmBackends";

// Owns selection state and merges live IQM machines (fetched via React Query
// through the /api/iqm proxy) ahead of the static placeholder catalog.
export default function BackendCatalog({ backends }: { backends: Backend[] }) {
  const [selected, setSelected] = useState<Backend | null>(null);
  const { data: iqmBackends = [] } = useIqmBackends();

  const allBackends = [...iqmBackends, ...backends];
  const onlineCount = allBackends.filter((b) => b.status === "online").length;

  return (
    <>
      <p className="mb-6 text-xs text-gray-500">
        {allBackends.length} Backends, {onlineCount} Online
      </p>

      <BackendGrid backends={allBackends} onSelect={setSelected} />

      {selected && (
        <BackendModal backend={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
