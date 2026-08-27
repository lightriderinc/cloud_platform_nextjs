"use client";

import type { AvailableSlot, ReservationDuration } from "@/lib/quantum/reservations";
import { useEffect } from "react";
import { MdClose } from "react-icons/md";
import ReservationSlotPicker from "./ReservationSlotPicker";

// Slot-picking half of ReservationBackendModal's "book" tab, pulled out into
// its own modal so it can be opened directly from a "Choose a slot" button
// instead of always being nested inside the book/mine tabbed modal. Duration
// is chosen beforehand (on the "Book a slot" card) and passed in, so this
// modal only surfaces the calendar and timezone banner.
export default function ChooseSlotModal({
  duration,
  onClose,
  onPick,
}: {
  duration: ReservationDuration;
  onClose: () => void;
  onPick: (slot: AvailableSlot) => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a slot"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto default-radius bg-white p-8 shadow-xl animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center cursor-pointer rounded-full text-lg text-gray-500 hover:text-gray-700"
        >
          <MdClose />
        </button>

        <h1 className="mb-6 pr-12 text-2xl font-semibold">Choose a slot</h1>

        <ReservationSlotPicker duration={duration} onPick={onPick} />
      </div>
    </div>
  );
}
