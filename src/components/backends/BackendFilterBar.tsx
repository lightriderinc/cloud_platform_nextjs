"use client";

import type { BackendFilterState, FilterCategory } from "@/lib/backends/filters";
import { useEffect, useRef, useState } from "react";
import { MdClose, MdExpandLess, MdExpandMore, MdFilterList } from "react-icons/md";
import BackendFilterModal from "./BackendFilterModal";
import FilterSection, { type FilterOption } from "./FilterSection";

const TYPE_OPTIONS: FilterOption[] = [
  { value: "QPU", label: "QPU" },
  { value: "Simulator", label: "Simulator" },
];
const ACCESS_OPTIONS: FilterOption[] = [
  { value: "available", label: "Available" },
  { value: "comingSoon", label: "Coming soon" },
];
const CATEGORY_ORDER: FilterCategory[] = ["provider", "type", "access"];
const CATEGORY_LABEL: Record<FilterCategory, string> = {
  provider: "Provider",
  type: "Type",
  access: "Access",
};

type MenuKey = FilterCategory | "all";

// Faceted filter bar for the catalog: an "add filter" trigger opening a
// dropdown of all three categories, plus one tag per category that already
// has a selection — each tag reopens just that category's checklist (via
// its own chevron) and clears it (via its x). Below xl there's no room for
// an anchored popover, so the same checklists render inside a modal instead
// (BackendFilterModal); both branches are controlled by the same props from
// BackendCatalog so their state never drifts apart.
export default function BackendFilterBar({
  providerOptions,
  filters,
  onToggle,
  onClearCategory,
  onClearAll,
}: {
  providerOptions: FilterOption[];
  filters: BackendFilterState;
  onToggle: (category: FilterCategory, value: string) => void;
  onClearCategory: (category: FilterCategory) => void;
  onClearAll: () => void;
}) {
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const optionsByCategory: Record<FilterCategory, FilterOption[]> = {
    provider: providerOptions,
    type: TYPE_OPTIONS,
    access: ACCESS_OPTIONS,
  };

  useEffect(() => {
    if (!openMenu) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(null);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  const activeCategories = CATEGORY_ORDER.filter((key) => filters[key].size > 0);

  function tagLabel(category: FilterCategory): string {
    const values = Array.from(filters[category]).map(
      (value) => optionsByCategory[category].find((o) => o.value === value)?.label ?? value,
    );
    return `${CATEGORY_LABEL[category]}: ${values.join(", ")}`;
  }

  function toggleMenu(key: MenuKey) {
    setOpenMenu((current) => (current === key ? null : key));
  }

  return (
    <>
      {/* xl and up: inline dropdown bar */}
      <div ref={containerRef} className="relative hidden flex-wrap items-center gap-2 xl:flex">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={openMenu === "all"}
          onClick={() => toggleMenu("all")}
          className="flex items-center gap-2 default-radius border border-gray-100 bg-white px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-50"
        >
          <MdFilterList className="text-gray-400" />
          <span>Filter backends</span>
        </button>

        {openMenu === "all" && (
          <div
            role="menu"
            className="absolute left-0 top-full z-50 mt-2 w-64 default-radius border border-gray-100 bg-white p-3 shadow-lg"
          >
            <div className="flex flex-col gap-3">
              {CATEGORY_ORDER.map((key, i) => (
                <div key={key} className={i > 0 ? "border-t border-gray-100 pt-3" : undefined}>
                  <FilterSection
                    title={CATEGORY_LABEL[key]}
                    options={optionsByCategory[key]}
                    selected={filters[key]}
                    onToggle={(value) => onToggle(key, value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeCategories.map((category) => (
          <div
            key={category}
            className="relative flex items-center gap-1 default-radius border border-gray-100 bg-white py-1 pl-3 pr-1.5 text-sm text-gray-700"
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={openMenu === category}
              onClick={() => toggleMenu(category)}
              className="flex max-w-[220px] items-center gap-1"
            >
              <span className="truncate" title={tagLabel(category)}>
                {tagLabel(category)}
              </span>
              {openMenu === category ? (
                <MdExpandLess className="shrink-0 text-gray-400" />
              ) : (
                <MdExpandMore className="shrink-0 text-gray-400" />
              )}
            </button>
            <button
              type="button"
              aria-label={`Clear ${CATEGORY_LABEL[category]} filter`}
              onClick={() => onClearCategory(category)}
              className="flex h-5 w-5 items-center justify-center default-radius text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <MdClose className="text-sm" />
            </button>

            {openMenu === category && (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-2 w-56 default-radius border border-gray-100 bg-white p-3 shadow-lg"
              >
                <FilterSection
                  title={CATEGORY_LABEL[category]}
                  options={optionsByCategory[category]}
                  selected={filters[category]}
                  onToggle={(value) => onToggle(category, value)}
                />
              </div>
            )}
          </div>
        ))}

        {activeCategories.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Below xl: a single button opening a modal with the same sections */}
      <div className="flex xl:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 default-radius border border-gray-100 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          <MdFilterList className="text-gray-400" />
          <span>Filters</span>
          {activeCategories.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center default-radius bg-gray-700 px-1 text-xs font-medium text-white">
              {activeCategories.reduce((sum, key) => sum + filters[key].size, 0)}
            </span>
          )}
        </button>
      </div>

      {mobileOpen && (
        <BackendFilterModal
          categoryOrder={CATEGORY_ORDER}
          optionsByCategory={optionsByCategory}
          filters={filters}
          onToggle={onToggle}
          onClearAll={onClearAll}
          onClose={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
