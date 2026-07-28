"use client";

import BackendSubmitModal from "@/components/quantum/BackendSubmitModal";

/**
 * Thin wrapper — the form/schematic/result logic now lives in the shared
 * BackendSubmitModal (also used by the /backends catalog's "Submit a job"
 * button). "iqm-garnet-mock" is free and unlimited for any signed-in user
 * (see backends.ts: costPerShotCents: 0).
 */
export default function DemoCircuitModal({ onClose }: { onClose: () => void }) {
  return (
    <BackendSubmitModal
      backend="iqm-garnet-mock"
      title="Submit Sample Circuit"
      onClose={onClose}
    />
  );
}
