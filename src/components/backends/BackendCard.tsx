import type { Backend } from "@/types/backend";
import BackendStatusBadge from "./BackendStatusBadge";
import BackendTypeTag from "./BackendTypeTag";
import BackendSpec from "./BackendSpec";
import TiltCard from "@/components/ui/TiltCard";

// A single backend card. Composes the smaller status / spec / tag pieces
// inside an interactive TiltCard surface. Queue and ID are intentionally
// omitted from the summary; full metrics live in the detail modal opened
// via onSelect.
export default function BackendCard({
  backend,
  onSelect,
}: {
  backend: Backend;
  onSelect?: (backend: Backend) => void;
}) {
  const { name, type, status, qubits, provider } = backend;

  return (
    <TiltCard
      onClick={onSelect ? () => onSelect(backend) : undefined}
      className="flex h-full cursor-pointer flex-col gap-3 rounded-lg border border-gray-300 bg-white p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold leading-tight">{name}</h2>
        <BackendStatusBadge status={status} />
      </div>

      <div className="flex flex-col gap-1.5">
        <BackendSpec label="Qubits" value={qubits} />
        <BackendSpec label="Provider" value={provider} />
      </div>

      <div className="mt-auto">
        <BackendTypeTag type={type} />
      </div>
    </TiltCard>
  );
}
