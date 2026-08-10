import { MdCheck } from "react-icons/md";

export interface FilterOption {
  value: string;
  label: string;
}

// One category's checklist, e.g. "Provider" with IQM/Rigetti/IBM rows.
// Shared by the desktop filter dropdowns and the mobile filter modal so the
// row styling (and checkbox behavior) only lives in one place.
export default function FilterSection({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: FilterOption[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 px-2 text-2xs font-medium uppercase tracking-wider text-gray-300">
        {title}
      </p>
      <div className="flex flex-col">
        {options.map((option) => {
          const checked = selected.has(option.value);
          return (
            <button
              key={option.value}
              type="button"
              role="menuitemcheckbox"
              aria-checked={checked}
              onClick={() => onToggle(option.value)}
              className="flex w-full items-center gap-2 default-radius px-2 py-1.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center default-radius border transition-colors ${
                  checked ? "border-gray-700 bg-gray-700 text-white" : "border-gray-300"
                }`}
              >
                {checked && <MdCheck className="text-[11px]" />}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
