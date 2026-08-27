"use client";

import type { ReservationDuration } from "@/lib/quantum/reservations";
import { DURATIONS, useSlotPricePreview } from "./useSlotPricePreview";

/**
 * Duration presets + per-slot price preview, split out of
 * ReservationSlotPicker so it can be shown outside the calendar (e.g. on the
 * "Book a slot" card) while still driving which duration the calendar fetches
 * for once it's opened.
 */
export default function ReservationDurationSelector({
  duration,
  onDurationChange,
}: {
  duration: ReservationDuration;
  onDurationChange: (duration: ReservationDuration) => void;
}) {
  const { durationLabel, priceLabel } = useSlotPricePreview(duration);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        Duration
      </label>
      <div className="flex gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => onDurationChange(d.value)}
            className={`px-3 py-1.5 bg-white default-radius text-sm font-medium border transition-colors cursor-pointer ${
              duration === d.value
                ? "border-[var(--brand-primary)] bg-red-50 text-[var(--brand-primary)]"
                : "border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* {priceLabel && (
        <p className="mt-1 text-sm font-medium text-gray-700">
          {durationLabel} — {priceLabel} per slot
        </p>
      )} */}
    </div>
  );
}
