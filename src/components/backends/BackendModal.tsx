"use client";

import BackendSubmitModal from "@/components/quantum/BackendSubmitModal";
import {
  availabilityTextClass,
  formatAvailability,
  formatQueue,
} from "@/lib/backends/availability";
import { getQuantumBackendId } from "@/lib/quantum/backends";
import type { Backend } from "@/types/backend";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import { RiExpandDiagonalFill } from "react-icons/ri";
import InfoBox from "../InfoBox";
import BackendConnectSection from "./BackendConnectSection";
import BackendStatusBadge from "./BackendStatusBadge";
import QubitMap from "./QubitMap";

type Spec = { label: string; value: React.ReactNode };

// Detail view for a single backend, opened from a card. Reads everything
// from the `backend` object so swapping placeholder data for API data needs
// no changes here. Spec rows with no value are dropped so the grid never
// shows empty cells.
export default function BackendModal({
  backend,
  onClose,
  isAuthenticated,
}: {
  backend: Backend;
  onClose: () => void;
  isAuthenticated: boolean;
}) {
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const {
    name,
    status,
    queueDepth,
    type,
    qubits,
    provider,
    pricing,
    availability,
  } = backend;
  const quantumBackendId = getQuantumBackendId(backend.id);
  const d = backend.details ?? {};

  const pct = (n?: number) => (n != null ? `${n} %` : undefined);
  const us = (n?: number) => (n != null ? `${n} µs` : undefined);
  const availabilityLabel = formatAvailability(availability);

  const specs: Spec[] = (
    [
      { label: "Type", value: type },
      { label: "Qubits", value: qubits },
      { label: "Provider", value: provider },
      {
        label: "Queue",
        value: queueDepth !== null ? formatQueue(queueDepth) : null,
      },
      {
        label: "Availability",
        value: availabilityLabel ? (
          <span className={availabilityTextClass(availability)}>
            {availabilityLabel}
          </span>
        ) : null,
      },
      { label: "ID", value: backend.id },
      { label: "Topology", value: d.topology },
      {
        label: "Pulse-level access",
        value:
          d.pulseLevelAccess === undefined
            ? undefined
            : d.pulseLevelAccess
              ? "Available"
              : "Unavailable",
      },
      {
        label: "Max. shots per circuit",
        value: d.maxShotsPerCircuit?.toLocaleString(),
      },
      { label: "Max. circuits", value: d.maxCircuits },
      {
        label: "Median 1-qubit gate fidelity",
        value: pct(d.medianOneQubitFidelity),
      },
      {
        label: "Median 2-qubit gate fidelity",
        value: pct(d.medianTwoQubitFidelity),
      },
      { label: "Median readout fidelity", value: pct(d.medianReadoutFidelity) },
      { label: "Median T1", value: us(d.medianT1Us) },
      { label: "Median T2 (Ramsey)", value: us(d.medianT2RamseyUs) },
      { label: "Median T2 (echo)", value: us(d.medianT2EchoUs) },
      { label: "Native gates", value: d.nativeGates?.join(", ") },
    ] as Spec[]
  ).filter(
    (spec) =>
      spec.value !== undefined && spec.value !== null && spec.value !== "",
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} details`}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto default-radius bg-white p-8 shadow-xl animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center cursor-pointer rounded-full text-lg text-gray-500 hover:text-gray-700"
        >
          <MdClose />
        </button>

        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 pr-12">
          <h1 className="text-2xl font-semibold">{name}</h1>
          <BackendStatusBadge status={status} />
          {/* Only the real Cepheus-1-108Q device (not its mock or the
              reservation card) has topology/calibration data — LR-TECH-001
              Phase 6. */}
          {backend.id === "rigetti.qpu.Cepheus-1-108Q" && (
            <Link
              href={`/backends/rigetti-cepheus-1-108q`}
              className="font-medium text-gray-500 inline-flex items-center hover:text-[var(--brand-primary)]"
            >
              <span className="inline-flex items-center gap-2 cursor-pointer">
                <span className="text-sm font-medium">View full details</span>
                <RiExpandDiagonalFill />
              </span>
            </Link>
          )}
        </div>

        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          {d.description && (
            <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
              {d.description}
            </p>
          )}
          {pricing && (
            <div className="flex shrink-0 flex-col gap-1 text-sm">
              <span className="font-medium">
                {pricing.creditsPerSecond.toFixed(2)} credits / second
              </span>
              <span className="font-medium">
                {pricing.creditsPerHour.toFixed(2)} credits / hour
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
          {specs.map((spec) => (
            <div key={spec.label}>
              <p className="text-xs text-gray-500">{spec.label}</p>
              <p className="mt-1 text-sm text-gray-900">{spec.value}</p>
            </div>
          ))}
        </div>

        {d.qubitMap && d.qubitMap.nodes.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-base font-semibold">Qubit map</h2>
            {backend.id === "rigetti.qpu.Cepheus-1-108Q" && (
              <InfoBox>
                The following qubit map shows a simplified representation for Rigetti Cepheus 1-108Q. <br />
                For the most accurate information, please visit the device&apos;s Topology & Calibration page.
              </InfoBox>
            )}
            <QubitMap data={d.qubitMap} />
          </div>
        )}

        <details className="mt-8 default-radius border border-gray-100 p-4">
          <summary className="cursor-pointer select-none text-lg font-medium">
            Connect to {name}
          </summary>
          <BackendConnectSection
            backend={backend}
            isAuthenticated={isAuthenticated}
            onSubmitJob={
              quantumBackendId ? () => setShowSubmit(true) : undefined
            }
          />
        </details>
      </div>

      {showSubmit && quantumBackendId && (
        <BackendSubmitModal
          backend={quantumBackendId}
          title={`Submit a job to ${name}`}
          onClose={() => setShowSubmit(false)}
        />
      )}
    </div>
  );
}
