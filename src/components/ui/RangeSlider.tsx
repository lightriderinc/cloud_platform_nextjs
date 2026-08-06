"use client";

// Labelled range input with optional flanking icons. The slider itself is
// styled globally in globals.css (`input[type="range"]`) alongside the other
// input styling, so this component only owns layout and labelling.

import type { ReactNode } from "react";

type Props = {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Small icon rendered to the left of the track (e.g. zoom-out). */
  leadingIcon?: ReactNode;
  /** Small icon rendered to the right of the track (e.g. zoom-in). */
  trailingIcon?: ReactNode;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

export default function RangeSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  leadingIcon,
  trailingIcon,
  disabled = false,
  className,
  ariaLabel,
}: Props) {
  return (
    <div className={className}>
      {label && <label className="mb-1 block text-xs text-gray-500">{label}</label>}
      <div className="flex items-center gap-2">
        {leadingIcon && (
          <span className="shrink-0 text-base text-gray-300">{leadingIcon}</span>
        )}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
        {trailingIcon && (
          <span className="shrink-0 text-base text-gray-300">{trailingIcon}</span>
        )}
      </div>
    </div>
  );
}
