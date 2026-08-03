"use client";

// Sort control for the card view, styled to match the account dropdown in
// UserCard: a trigger button that opens an absolute panel of menu rows,
// closing on an outside click or Escape.

import type { BackendSortKey, SortDirection } from "@/lib/backends/sort";
import { useEffect, useRef, useState } from "react";
import { MdExpandLess, MdExpandMore } from "react-icons/md";

const OPTIONS: { key: BackendSortKey; label: string }[] = [
  { key: "provider", label: "Provider" },
  { key: "qubits", label: "Qubits" },
  { key: "type", label: "Type" },
];

export default function BackendSortMenu({
  sortKey,
  sortDirection,
  onSort,
}: {
  sortKey: BackendSortKey;
  sortDirection: SortDirection;
  onSort: (key: BackendSortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const activeLabel = OPTIONS.find((o) => o.key === sortKey)?.label;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 default-radius border border-gray-100 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
      >
        <span>{`Sort: ${activeLabel}`}</span>
        <span className="text-gray-400">{sortDirection === "asc" ? "↑" : "↓"}</span>
        {open ? (
          <MdExpandLess className="text-gray-400" />
        ) : (
          <MdExpandMore className="text-gray-400" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-48 default-radius border border-gray-100 bg-white p-3 shadow-lg"
        >
          {OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="menuitemradio"
              aria-checked={sortKey === option.key}
              onClick={() => onSort(option.key)}
              className={`mb-1 flex w-full items-center justify-between default-radius px-2 py-1.5 text-left text-sm transition-colors last:mb-0 ${
                sortKey === option.key
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>{option.label}</span>
              {sortKey === option.key && (
                <span className="text-gray-400">{sortDirection === "asc" ? "↑" : "↓"}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
