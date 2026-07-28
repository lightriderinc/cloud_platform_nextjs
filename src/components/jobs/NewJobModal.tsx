"use client";

import BackendSubmitModal from "@/components/quantum/BackendSubmitModal";

/**
 * Thin wrapper — the form/credit-gate/result logic now lives in the shared
 * BackendSubmitModal (also used by the /backends catalog's "Submit a job"
 * button and the Dashboard's demo tile). Real hardware ("iqm-garnet"), so
 * the credit gate is active here — see backends.ts: costPerShotCents.
 */
export default function NewJobModal({ onClose }: { onClose: () => void }) {
  return (
    <BackendSubmitModal backend="iqm-garnet" title="New Job" onClose={onClose} />
  );
}
