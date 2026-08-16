import type { BackendSortKey, SortDirection } from "@/lib/backends/sort";
import { getQuantumBackendId } from "@/lib/quantum/backends";
import { isReservationCatalogId } from "@/lib/quantum/reservations";
import type { Backend } from "@/types/backend";
import BackendStatusBadge from "./BackendStatusBadge";
import BackendTypeTag from "./BackendTypeTag";

const COLUMNS: { label: string; sortKey?: BackendSortKey }[] = [
  { label: "Name" },
  { label: "Provider", sortKey: "provider" },
  { label: "Qubits", sortKey: "qubits" },
  { label: "Type", sortKey: "type" },
  { label: "Status" },
];

// Table view of the backend catalog, styled to match JobsList. Row click
// opens the same detail modal as a card via `onSelect`. Provider/Qubits/Type
// headers double as sort controls, mirroring the card view's sort button.
export default function BackendList({
  backends,
  onSelect,
  sortKey,
  sortDirection,
  onSort,
}: {
  backends: Backend[];
  onSelect?: (backend: Backend) => void;
  sortKey: BackendSortKey;
  sortDirection: SortDirection;
  onSort: (key: BackendSortKey) => void;
}) {
  return (
    <div className="overflow-x-auto default-radius border border-gray-100">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            {COLUMNS.map((column) => (
              <th
                key={column.label}
                className="whitespace-nowrap px-4 py-2 font-medium text-gray-700"
              >
                {column.sortKey ? (
                  <button
                    type="button"
                    onClick={() => onSort(column.sortKey!)}
                    className="flex cursor-pointer items-center gap-1 select-none hover:text-gray-900"
                  >
                    {column.label}
                    <span className="text-gray-400">
                      {sortKey === column.sortKey
                        ? sortDirection === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </span>
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {backends.map((backend) => {
            const comingSoon =
              !isReservationCatalogId(backend.id) && getQuantumBackendId(backend.id) === null;
            return (
              <tr
                key={backend.id}
                onClick={onSelect ? () => onSelect(backend) : undefined}
                className={`cursor-pointer border-b border-gray-100 bg-white transition-colors last:border-0 hover:bg-gray-50 ${comingSoon ? "opacity-70" : "opacity-100"}`}
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
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {comingSoon && (
                    <span
                      className="w-fit default-radius px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: "var(--brand-tertiary)" }}
                    >
                      Coming soon
                    </span>
                  )}
                  {!comingSoon && (
                    <BackendStatusBadge status={backend.status} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
