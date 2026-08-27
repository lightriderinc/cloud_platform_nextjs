"use client";

import BackendStatusBadge from "@/components/backends/BackendStatusBadge";
import type { AvailableSlot, ReservationDuration } from "@/lib/quantum/reservations";
import type { Backend } from "@/types/backend";
import { useEffect, useState } from "react";
import { MdClose } from "react-icons/md";
import MyReservationsList from "./MyReservationsList";
import ReservationBookingModal from "./ReservationBookingModal";
import ReservationDurationSelector from "./ReservationDurationSelector";
import ReservationSlotPicker from "./ReservationSlotPicker";

type Tab = "book" | "mine";

/**
 * Detail modal for the "reserved" card — a self-contained alternative to
 * BackendModal (slot picker + booking + "my reservations" instead of the
 * spec grid + submit-a-sample-circuit flow), kept as its own component so
 * removing the reservation model later doesn't touch BackendModal at all.
 */
export default function ReservationBackendModal({
  backend,
  onClose,
}: {
  backend: Backend;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("book");
  const [duration, setDuration] = useState<ReservationDuration>(15);
  const [pickedSlot, setPickedSlot] = useState<AvailableSlot | null>(null);
  const [justBooked, setJustBooked] = useState(false);

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
      aria-label={`${backend.name} reservations`}
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

        <div className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-2 pr-12">
          <h1 className="text-2xl font-semibold">{backend.name}</h1>
          <BackendStatusBadge status={backend.status} />
        </div>
        {backend.details?.description && (
          <p className="mb-6 max-w-xl text-sm leading-relaxed text-gray-600">
            {backend.details.description}
          </p>
        )}

        <div className="mb-6 flex gap-1 border-b border-gray-100">
          {(["book", "mine"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                tab === t
                  ? "border-b-2 border-[var(--brand-primary)] text-[var(--brand-primary)]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "book" ? "Book a slot" : "My reservations"}
            </button>
          ))}
        </div>

        {tab === "book" &&
          (justBooked ? (
            <div className="default-radius border border-dashed border-green-200 bg-green-50 p-6 text-center text-sm text-green-700">
              Reservation confirmed — see it under &quot;My reservations&quot;.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <ReservationDurationSelector duration={duration} onDurationChange={setDuration} />
              <ReservationSlotPicker duration={duration} onPick={setPickedSlot} />
            </div>
          ))}
        {tab === "mine" && <MyReservationsList />}
      </div>

      {pickedSlot && (
        <ReservationBookingModal
          slot={pickedSlot}
          onClose={() => setPickedSlot(null)}
          onBooked={() => {
            setPickedSlot(null);
            setJustBooked(true);
            setTab("mine");
          }}
        />
      )}
    </div>
  );
}
