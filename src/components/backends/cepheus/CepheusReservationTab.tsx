"use client";

import MyReservationsList from "@/components/reservations/MyReservationsList";
import ReservationBookingModal from "@/components/reservations/ReservationBookingModal";
import ReservationSlotPicker from "@/components/reservations/ReservationSlotPicker";
import { RESERVED_CEPHEUS_BACKEND_CARD, type AvailableSlot } from "@/lib/quantum/reservations";
import { useState } from "react";

// Reservation content from ReservationBackendModal, laid out as stacked
// sections instead of the modal's nested book/mine tabs — a full page has
// the room to show both at once.
export default function CepheusReservationTab() {
  const [pickedSlot, setPickedSlot] = useState<AvailableSlot | null>(null);
  const [justBooked, setJustBooked] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      {RESERVED_CEPHEUS_BACKEND_CARD.details?.description && (
        <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
          {RESERVED_CEPHEUS_BACKEND_CARD.details.description}
        </p>
      )}

      <div>
        <h3 className="mb-3 text-base font-semibold text-gray-800">Book a slot</h3>
        {justBooked ? (
          <div className="default-radius border border-dashed border-green-200 bg-green-50 p-6 text-center text-sm text-green-700">
            Reservation confirmed — see it under &quot;My reservations&quot;.
          </div>
        ) : (
          <ReservationSlotPicker onPick={setPickedSlot} />
        )}
      </div>

      <div>
        <h3 className="mb-3 text-base font-semibold text-gray-800">My reservations</h3>
        <MyReservationsList />
      </div>

      {pickedSlot && (
        <ReservationBookingModal
          slot={pickedSlot}
          onClose={() => setPickedSlot(null)}
          onBooked={() => {
            setPickedSlot(null);
            setJustBooked(true);
          }}
        />
      )}
    </div>
  );
}
