"use client";

import type { BackendFilterState, FilterCategory } from "@/lib/backends/filters";
import { useEffect } from "react";
import { MdClose } from "react-icons/md";
import LRButton from "@/components/ui/LRButton";
import FilterSection, { type FilterOption } from "./FilterSection";

const CATEGORY_LABEL: Record<FilterCategory, string> = {
  provider: "Provider",
  type: "Type",
  access: "Access",
};

// Sub-xl equivalent of the desktop filter dropdowns: same sections and
// checklist rows, laid out in a centered modal (styled like BackendModal)
// instead of an anchored popover, since there isn't room for one.
export default function BackendFilterModal({
  categoryOrder,
  optionsByCategory,
  filters,
  onToggle,
  onClearAll,
  onClose,
}: {
  categoryOrder: FilterCategory[];
  optionsByCategory: Record<FilterCategory, FilterOption[]>;
  filters: BackendFilterState;
  onToggle: (category: FilterCategory, value: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const hasFilters = categoryOrder.some((key) => filters[key].size > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Filter backends"
    >
      <div
        className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto default-radius bg-white p-6 shadow-xl animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filter backends</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center cursor-pointer rounded-full text-lg text-gray-500 hover:text-gray-700"
          >
            <MdClose />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {categoryOrder.map((key, i) => (
            <div key={key} className={i > 0 ? "border-t border-gray-100 pt-5" : undefined}>
              <FilterSection
                title={CATEGORY_LABEL[key]}
                options={optionsByCategory[key]}
                selected={filters[key]}
                onToggle={(value) => onToggle(key, value)}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClearAll}
            disabled={!hasFilters}
            className="text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline disabled:pointer-events-none disabled:opacity-40"
          >
            Clear all
          </button>
          <LRButton variant="secondary" onClick={onClose}>
            Done
          </LRButton>
        </div>
      </div>
    </div>
  );
}
