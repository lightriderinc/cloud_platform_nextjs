import { getQuantumBackendId } from "@/lib/quantum/backends";
import type { Backend } from "@/types/backend";
import BackendStatusBadge from "./BackendStatusBadge";
import BackendTypeTag from "./BackendTypeTag";

const HEADERS = ["Name", "Provider", "Qubits", "Type", "Status"];

// Table view of the backend catalog, styled to match JobsList. Row click
// opens the same detail modal as a card via `onSelect`.
export default function BackendList({
  backends,
  onSelect,
}: {
  backends: Backend[];
  onSelect?: (backend: Backend) => void;
}) {
  return (
    <div className="overflow-x-auto default-radius border border-gray-100">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            {HEADERS.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-2 font-medium text-gray-700">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {backends.map((backend) => {
            const comingSoon = getQuantumBackendId(backend.id) === null;
            return (
              <tr
                key={backend.id}
                onClick={onSelect ? () => onSelect(backend) : undefined}
                className="cursor-pointer border-b border-gray-100 bg-white transition-colors last:border-0 hover:bg-gray-50"
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                  {backend.name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                  {backend.provider}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                  {backend.qubits}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-2">
                    <BackendTypeTag type={backend.type} />
                    {comingSoon && (
                      <span
                        className="w-fit default-radius px-2 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: "var(--brand-tertiary)" }}
                      >
                        Coming soon
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <BackendStatusBadge status={backend.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
