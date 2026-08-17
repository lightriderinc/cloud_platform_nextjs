"use client";

import CreditsSummary, { fetchJson, formatCreditsWithUsd, type Credits } from "@/components/billing/CreditsSummary";
import LRButton from "@/components/ui/LRButton";
import WarningBox from "@/components/WarningBox";
import { bookReservation, getTimezoneCaption, type AvailableSlot } from "@/lib/quantum/reservations";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MdSchedule } from "react-icons/md";

function formatWindow(slot: AvailableSlot): string {
  const start = new Date(slot.startTime);
  const end = new Date(slot.endTime);
  const dateLabel = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startLabel = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endLabel = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dateLabel}, ${startLabel}–${endLabel}`;
}

/**
 * Confirmation step for a slot picked in ReservationSlotPicker. Reuses the
 * same purchased/blocked-by-credits gate BackendSubmitModal already uses
 * (CreditsSummary in place of the form) rather than a new insufficient-funds
 * UI — an amount that's positive but still short of this specific
 * reservation's price is instead caught server-side (402 insufficient_credits)
 * and shown via the same red-text mutation-error pattern.
 */
export default function ReservationBookingModal({
  slot,
  onClose,
  onBooked,
}: {
  slot: AvailableSlot;
  onClose: () => void;
  onBooked: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: credits } = useQuery({
    queryKey: ["billing", "credits"],
    queryFn: () => fetchJson<Credits>("/api/billing/credits"),
  });
  const blockedByCredits =
    credits !== undefined && (credits.purchasedCents <= 0 || credits.remainingCents <= 0);

  // Based on the slot's own date (not "now") so it reflects the right side
  // of a DST transition if the slot falls on the other side of one. Same
  // caption format as the slot picker's banner, for consistency.
  const tzCaption = getTimezoneCaption(new Date(slot.startTime));

  const {
    mutate,
    isPending,
    isError,
    error,
  } = useMutation({
    mutationFn: () =>
      bookReservation({
        startTime: slot.startTime,
        endTime: slot.endTime,
        quotedPriceCents: slot.priceCents,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "credits"] });
      onBooked();
    },
  });

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm reservation"
    >
      <div
        className="relative w-full max-w-md default-radius bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold">Confirm reservation</h3>

        <div className="mb-3 flex flex-col gap-1 text-sm">
          <p className="font-medium text-gray-800">{formatWindow(slot)}</p>
          <p className="text-gray-600">{formatCreditsWithUsd(slot.creditsPrice)}</p>
        </div>

        {/* Prominent, not fine print — this is the same window a misread
            hour here books real money against a slot that can't be
            cancelled, so the timezone is repeated here, not just in the
            slot picker. */}
        <div className="mb-5 flex items-center gap-2 default-radius border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
          <MdSchedule className="shrink-0 text-base" />
          {tzCaption}
        </div>

        {credits === undefined ? null : blockedByCredits ? (
          <CreditsSummary />
        ) : (
          <>
            {isError && (
              <p className="mb-3 text-sm text-red-500">
                {error instanceof Error ? error.message : "Failed to book reservation."}
              </p>
            )}
            <WarningBox>
              This reservation is exclusive access to real Rigetti hardware — once booked, it can&apos;t be
              cancelled.
            </WarningBox>
            <div className="mt-5 flex justify-end gap-3">
              <LRButton variant="secondary-outline" onClick={onClose} disabled={isPending}>
                Cancel
              </LRButton>
              <LRButton variant="primary" onClick={() => mutate()} disabled={isPending}>
                {isPending ? "Booking…" : "Confirm booking"}
              </LRButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
