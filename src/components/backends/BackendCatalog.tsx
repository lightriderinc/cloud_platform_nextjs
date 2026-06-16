"use client";

import { useState } from "react";
import type { Backend } from "@/types/backend";
import BackendGrid from "./BackendGrid";
import BackendModal from "./BackendModal";

// Client wrapper that owns which backend is selected and renders the
// detail modal for it. Keeps the grid/card components free of state.
export default function BackendCatalog({ backends }: { backends: Backend[] }) {
  const [selected, setSelected] = useState<Backend | null>(null);

  return (
    <>
      <BackendGrid backends={backends} onSelect={setSelected} />
      {selected && (
        <BackendModal backend={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
