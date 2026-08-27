"use client";

import { formatCredits, formatCreditsWithUsd } from "@/components/billing/CreditsSummary";
import { fetchAvailableSlots, type ReservationDuration } from "@/lib/quantum/reservations";
import { useQuery } from "@tanstack/react-query";

export const DURATIONS: { value: ReservationDuration; label: string }[] = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "60 min" },
];

/**
 * Cheap "just the next batch" price lookup for a duration (no date range,
 * so it's a single small fetch rather than the calendar's multi-day fan-out)
 * — shared by the duration selector's price line and the "Choose a slot"
 * button's cost label. Both mount the same queryKey, so react-query dedupes
 * them into one request.
 */
export function useSlotPricePreview(duration: ReservationDuration) {
  const { data: slots } = useQuery({
    queryKey: ["reservations", "available", "preview", duration],
    queryFn: () => fetchAvailableSlots(duration),
  });

  const durationLabel = DURATIONS.find((d) => d.value === duration)?.label;
  const priceLabel = slots && slots.length > 0 ? formatCreditsWithUsd(slots[0].creditsPrice) : null;

  return { durationLabel, priceLabel };
}


export function useSlotPricePreviewCredits(duration: ReservationDuration) {
  const { data: slots } = useQuery({
    queryKey: ["reservations", "available", "preview", duration],
    queryFn: () => fetchAvailableSlots(duration),
  });

  const durationLabel = DURATIONS.find((d) => d.value === duration)?.label;
  const priceLabel = slots && slots.length > 0 ? formatCredits(slots[0].creditsPrice) : null;

  return { durationLabel, priceLabel };
}