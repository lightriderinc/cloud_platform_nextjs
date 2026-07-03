"use client";

import { MdHelpOutline } from "react-icons/md";

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export default function ShotsInput({ value, onChange }: Props) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
        Shots
        <span className="relative group">
          <MdHelpOutline className="cursor-help text-base text-gray-400" />
          <span className="pointer-events-none absolute bottom-full left-20 z-20 mb-2 w-64 -translate-x-1/2 rounded bg-gray-800 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            The number of times the circuit is executed. The more shots you use
            the higher the accuracy of your results.
          </span>
        </span>
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        min={1}
        className="default-radius w-full border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
      />
    </div>
  );
}
