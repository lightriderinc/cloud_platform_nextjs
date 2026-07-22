"use client";

import { useState } from "react";

/**
 * Small "ⓘ" affordance for a short tooltip next to a specific non-obvious
 * field. Use sparingly — not decoration for every label.
 */
export default function HintIcon({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={text}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="flex h-4 w-4 items-center justify-center text-xs leading-none text-gray-400 transition-colors hover:text-gray-600"
      >
        ⓘ
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-10 mb-1.5 w-max max-w-56 -translate-x-1/2 default-radius bg-gray-800 px-2 py-1 text-xs text-white shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
