"use client";

import { useState } from "react";

interface PresetSelectorProps {
  label: string;
  presets: number[];
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** Render a preset button's text, e.g. (n) => `${n}B`. Defaults to String(n). */
  formatPreset?: (n: number) => string;
  customPlaceholder?: string;
}

const chipBase =
  "px-3 py-1.5 default-radius text-sm font-medium border transition-colors cursor-pointer";
const chipOn =
  "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]";
const chipOff =
  "border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50";

/**
 * Reusable "pick a preset or enter a custom number" control. Used for entropy
 * byte length here, and generic enough for other numeric presets (e.g. password
 * length) elsewhere.
 */
export default function PresetSelector({
  label,
  presets,
  value,
  onChange,
  min,
  max,
  formatPreset = (n) => String(n),
  customPlaceholder,
}: PresetSelectorProps) {
  const [useCustom, setUseCustom] = useState(!presets.includes(value));
  const [customInput, setCustomInput] = useState(
    presets.includes(value) ? "" : String(value),
  );

  function selectPreset(n: number) {
    setUseCustom(false);
    onChange(n);
  }

  function selectCustom() {
    setUseCustom(true);
    const parsed = parseInt(customInput, 10);
    onChange(Number.isNaN(parsed) ? 0 : parsed);
  }

  function onCustomInput(raw: string) {
    setCustomInput(raw);
    const parsed = parseInt(raw, 10);
    onChange(Number.isNaN(parsed) ? 0 : parsed);
  }

  return (
    <div>
      <label className="mb-2.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="mb-3 flex flex-wrap gap-2">
        {presets.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => selectPreset(n)}
            className={[
              chipBase,
              !useCustom && value === n ? chipOn : chipOff,
            ].join(" ")}
          >
            {formatPreset(n)}
          </button>
        ))}
        <button
          type="button"
          onClick={selectCustom}
          className={[chipBase, useCustom ? chipOn : chipOff].join(" ")}
        >
          Custom
        </button>
      </div>
      {useCustom && (
        <input
          type="number"
          min={min}
          max={max}
          placeholder={customPlaceholder ?? `Enter a value (${min}–${max})`}
          value={customInput}
          onChange={(e) => onCustomInput(e.target.value)}
          autoFocus
          className="default-radius w-full border border-gray-100 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-300"
        />
      )}
    </div>
  );
}
