import TiltCard from "@/components/ui/TiltCard";
import {
  availabilityTextClass,
  formatAvailability,
  formatQueue,
} from "@/lib/backends/availability";
import { getQuantumBackendId } from "@/lib/quantum/backends";
import type { Backend } from "@/types/backend";
import BackendSpec from "./BackendSpec";
import BackendStatusBadge from "./BackendStatusBadge";
import BackendTypeTag from "./BackendTypeTag";

// A single backend card. Composes the smaller status / spec / tag pieces
// inside an interactive TiltCard surface. Live queue depth and availability are
// shown when the provider reports them (IQM); ID and full metrics live in the
// detail modal opened via onSelect.
export default function BackendCard({
  backend,
  onSelect,
}: {
  backend: Backend;
  onSelect?: (backend: Backend) => void;
}) {
  const { name, type, status, qubits, provider, queueDepth, availability } =
    backend;
  const comingSoon = getQuantumBackendId(backend.id) === null;
  const availabilityLabel = formatAvailability(availability);

  return (
    <TiltCard
      onClick={onSelect ? () => onSelect(backend) : undefined}
      className="flex h-full cursor-pointer flex-col gap-3 default-radius bg-gray-100 border border-gray-100 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold leading-tight">{name}</h2>
        <BackendStatusBadge status={status} />
      </div>

      <div className="flex flex-col gap-1.5">
        <BackendSpec label="Qubits" value={qubits} />
        <BackendSpec label="Provider" value={provider} />
        {queueDepth !== null && (
          <BackendSpec label="Queue" value={formatQueue(queueDepth)} />
        )}
        {availabilityLabel && (
          <BackendSpec
            label="Availability"
            value={
              <span className={availabilityTextClass(availability)}>
                {availabilityLabel}
              </span>
            }
          />
        )}
      </div>

      <div className="mt-auto flex items-center gap-2">
        <BackendTypeTag type={type} />
        {comingSoon && (
          <span
            className="w-fit default-radius px-2 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: "var(--brand-tertiary)" }}
          >
            Coming soon
          </span>
        )}
      </div>
    </TiltCard>
  );
}
