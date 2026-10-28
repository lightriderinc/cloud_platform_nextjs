"use client";

import DownloadButton from "@/components/ui/DownloadButton";
import type { EdgeEntry, QubitsData, TopologyEnvelope } from "@/lib/topology/client";
import { couplersCsv, exportBaseName, qubitsCsv, snapshotJson } from "@/lib/topology/exportSnapshot";
import { useMemo } from "react";

// LRButton has no size prop and puts its own padding before className, so
// the compact header size needs Tailwind 4's important modifier.
const COMPACT = "py-1! pl-2! pr-2.5! gap-1! text-xs!";

/** Downloads of the calibration data the map is showing, built in the browser from data already fetched. */
export default function SnapshotExport({
  qubitsEnvelope,
  edges,
}: {
  qubitsEnvelope: TopologyEnvelope<QubitsData>;
  edges: EdgeEntry[];
}) {
  const files = useMemo(() => {
    const { data, ...meta } = qubitsEnvelope;
    const base = exportBaseName(meta);
    return {
      json: { name: `${base}_snapshot.json`, value: snapshotJson(meta, data.lattice, data.qubits, edges) },
      qubits: { name: `${base}_qubits.csv`, value: qubitsCsv(meta, data.qubits) },
      couplers: { name: `${base}_couplers.csv`, value: couplersCsv(meta, edges) },
    };
  }, [qubitsEnvelope, edges]);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500" data-export>
      <span>Download</span>
      <DownloadButton value={files.json.value} filename={files.json.name} mimeType="application/json" label="JSON" className={COMPACT} />
      <DownloadButton value={files.qubits.value} filename={files.qubits.name} mimeType="text/csv" label="Qubits CSV" className={COMPACT} />
      <DownloadButton value={files.couplers.value} filename={files.couplers.name} mimeType="text/csv" label="Couplers CSV" className={COMPACT} />
    </div>
  );
}
