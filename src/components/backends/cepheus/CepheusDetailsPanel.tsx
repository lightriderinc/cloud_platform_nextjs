import BackendStatusBadge from "@/components/backends/BackendStatusBadge";
import {
  availabilityTextClass,
  formatAvailability,
  formatQueue,
} from "@/lib/backends/availability";
import type { Backend } from "@/types/backend";

type Spec = { label: string; value: React.ReactNode };

// Details tab for the Cepheus page — the same spec rows BackendModal shows,
// minus the qubit map (its own tab covers topology) and plus a Status row
// (BackendModal shows status as a badge next to the title only; here it's
// also one of the listed items since there's no modal header to put it in).
export default function CepheusDetailsPanel({ backend }: { backend: Backend }) {
  const { status, queueDepth, type, qubits, provider, pricing, availability } = backend;
  const d = backend.details ?? {};

  const pct = (n?: number) => (n != null ? `${n} %` : undefined);
  const us = (n?: number) => (n != null ? `${n} µs` : undefined);
  const availabilityLabel = formatAvailability(availability);

  const specs: Spec[] = (
    [
      { label: "Status", value: <BackendStatusBadge status={status} /> },
      { label: "Type", value: type },
      { label: "Qubits", value: qubits },
      { label: "Provider", value: provider },
      { label: "Queue", value: queueDepth !== null ? formatQueue(queueDepth) : null },
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
      { label: "Max. shots per circuit", value: d.maxShotsPerCircuit?.toLocaleString() },
      { label: "Max. circuits", value: d.maxCircuits },
      { label: "Median 1-qubit gate fidelity", value: pct(d.medianOneQubitFidelity) },
      { label: "Median 2-qubit gate fidelity", value: pct(d.medianTwoQubitFidelity) },
      { label: "Median readout fidelity", value: pct(d.medianReadoutFidelity) },
      { label: "Median T1", value: us(d.medianT1Us) },
      { label: "Median T2 (Ramsey)", value: us(d.medianT2RamseyUs) },
      { label: "Median T2 (echo)", value: us(d.medianT2EchoUs) },
      { label: "Native gates", value: d.nativeGates?.join(", ") },
    ] as Spec[]
  ).filter((spec) => spec.value !== undefined && spec.value !== null && spec.value !== "");

  return (
    <div>
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        {d.description && (
          <p className="max-w-2xl text-sm leading-relaxed text-gray-600">{d.description}</p>
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
    </div>
  );
}
