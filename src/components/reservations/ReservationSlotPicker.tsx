"use client";

import { formatCreditsWithUsd } from "@/components/billing/CreditsSummary";
import {
  fetchAvailableSlots,
  type AvailableSlot,
  type ReservationDuration,
} from "@/lib/quantum/reservations";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const DURATIONS: { value: ReservationDuration; label: string }[] = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "60 min" },
];

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Duration is passed straight through to GET /reservations/available —
 * qpu-proxy/QCS does its own 15-minute-block stitching server-side
 * (verified: duration=30m returns properly stitched 30-minute windows at
 * ~2x the 15m price, advancing in 15-minute increments), so no client-side
 * block-merging logic is needed here.
 */
export default function ReservationSlotPicker({
  onPick,
}: {
  onPick: (slot: AvailableSlot) => void;
}) {
  const [duration, setDuration] = useState<ReservationDuration>(15);

  const {
    data: slots,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["reservations", "available", duration],
    queryFn: () => fetchAvailableSlots(duration),
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Duration</label>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDuration(d.value)}
              className={`default-radius border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                duration === d.value
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Rigetti books in 15-minute blocks — 30/60 min windows are consecutive blocks, priced accordingly.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse default-radius bg-gray-100" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-sm text-red-500">Failed to load available slots. Try again later.</p>
      ) : !slots || slots.length === 0 ? (
        <p className="default-radius border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
          No open slots right now for this duration.
        </p>
      ) : (
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {slots.map((slot) => (
            <button
              key={slot.startTime}
              type="button"
              onClick={() => onPick(slot)}
              className="flex items-center justify-between default-radius border border-gray-100 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 cursor-pointer"
            >
              <span className="font-medium text-gray-800">{formatSlotTime(slot.startTime)}</span>
              <span className="text-gray-600">{formatCreditsWithUsd(slot.creditsPrice)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
