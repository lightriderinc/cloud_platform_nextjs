"use client";

import { handleSignIn } from "@/app/actions/auth";
import BackendConnectSection from "@/components/backends/BackendConnectSection";
import BackendSubmitModal from "@/components/quantum/BackendSubmitModal";
import { getQuantumBackendId } from "@/lib/quantum/backends";
import type { Backend } from "@/types/backend";
import { useState } from "react";

export default function CepheusConnectionTab({
  backend,
  isAuthenticated,
}: {
  backend: Backend;
  isAuthenticated: boolean;
}) {
  const [showSubmit, setShowSubmit] = useState(false);
  const quantumBackendId = getQuantumBackendId(backend.id);

  if (!isAuthenticated) {
    return (
      <p className="mt-3 text-sm text-gray-600">
        <button
          type="button"
          onClick={() => handleSignIn()}
          className="brand-link cursor-pointer"
        >
          Log in
        </button>{" "}
        to access QPUs.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="mb-4 text-xl font-bold text-gray-600">Connect to {backend.name}</h2>
        <BackendConnectSection
          backend={backend}
          isAuthenticated={isAuthenticated}
          onSubmitJob={quantumBackendId ? () => setShowSubmit(true) : undefined}
        />
      </div>

      {showSubmit && quantumBackendId && (
        <BackendSubmitModal
          backend={quantumBackendId}
          title={`Submit a job to ${backend.name}`}
          onClose={() => setShowSubmit(false)}
        />
      )}
    </div>
  );
}
