"use client";

import CopyButton from "@/components/ui/CopyButton";
import type { EntropyResult } from "@/lib/entropy/generate";

interface EntropyHistoryProps {
  items: EntropyResult[];
  /** Load a past result back into the output panel. */
  onSelect?: (result: EntropyResult) => void;
  onClear?: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Session-only list of recent entropy generations with quick re-copy. */
export default function EntropyHistory({
  items,
  onSelect,
  onClear,
}: EntropyHistoryProps) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-600">Recent generations</h2>
        {items.length > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="cursor-pointer text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="default-radius border border-dashed border-gray-200 p-6 text-center text-xs text-gray-400">
          Entropy you generate in this session will be listed here.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 default-radius border border-gray-100 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">
                    {item.sourceName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {item.bytes}B · {formatTime(item.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-mono text-xs text-gray-500">
                  {item.value}
                </p>
              </div>
              {onSelect && (
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="shrink-0 cursor-pointer default-radius border border-gray-100 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-50"
                >
                  View
                </button>
              )}
              <CopyButton value={item.value} className="shrink-0" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
