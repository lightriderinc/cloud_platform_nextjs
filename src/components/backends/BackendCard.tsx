import TiltCard from "@/components/ui/TiltCard";
import type { Backend } from "@/types/backend";
import BackendSpec from "./BackendSpec";
import BackendStatusBadge from "./BackendStatusBadge";
import BackendTypeTag from "./BackendTypeTag";

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
      className="flex h-full cursor-pointer flex-col gap-3 default-radius bg-gray-100 border border-gray-200 p-4"
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
