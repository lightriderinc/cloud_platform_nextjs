"use client";

import MyReservationsList from "@/components/reservations/MyReservationsList";
import ReservationBookingModal from "@/components/reservations/ReservationBookingModal";
import ReservationSlotPicker from "@/components/reservations/ReservationSlotPicker";
import { type AvailableSlot } from "@/lib/quantum/reservations";
import { useState } from "react";

// Reservation content from ReservationBackendModal, laid out as stacked
// sections instead of the modal's nested book/mine tabs — a full page has
// the room to show both at once.
export default function CepheusReservationTab() {
  const [pickedSlot, setPickedSlot] = useState<AvailableSlot | null>(null);
  const [justBooked, setJustBooked] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
        Book a guaranteed time slot on Rigetti Cepheus-1-108Q QPU for exclusive
        access during your window.
      </p>

      <div>
        <h3 className="mb-4 text-xl font-bold text-gray-600">
          My reservations
        </h3>
        <MyReservationsList />
      </div>

      <div>
        <h3 className="mb-4 text-xl font-bold text-gray-600">Book a slot</h3>
        {justBooked ? (
          <div className="default-radius border border-dashed border-green-200 bg-green-50 p-6 text-center text-sm text-green-700">
            Reservation confirmed — see it under &quot;My reservations&quot;.
          </div>
        ) : (
          <ReservationSlotPicker onPick={setPickedSlot} />
        )}
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
