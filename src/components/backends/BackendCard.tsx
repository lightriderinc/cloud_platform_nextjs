import type { Backend } from "@/types/backend";
import BackendStatusBadge from "./BackendStatusBadge";
import BackendTypeTag from "./BackendTypeTag";
import BackendSpec from "./BackendSpec";

function formatQueue(queueDepth: number | null): string {
  if (queueDepth === null) return "—";
  return `${queueDepth} ${queueDepth === 1 ? "job" : "jobs"}`;
}

// A single backend card. Composes the smaller status / spec / tag pieces
// so each part stays reusable and the card just arranges them.
export default function BackendCard({ backend }: { backend: Backend }) {
  const { name, type, status, qubits, id, provider, queueDepth } = backend;

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold leading-tight">{name}</h2>
        <BackendStatusBadge status={status} />
      </div>

      <div className="flex flex-col gap-1.5">
        <BackendSpec label="Qubits" value={qubits} />
        <BackendSpec
          label="ID"
          value={<span className="text-xs">{id}</span>}
        />
        <BackendSpec label="Provider" value={provider} />
        <BackendSpec label="Queue" value={formatQueue(queueDepth)} />
      </div>

      <div className="mt-auto">
        <BackendTypeTag type={type} />
      </div>
    </article>
  );
}
