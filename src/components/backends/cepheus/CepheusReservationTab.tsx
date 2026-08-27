"use client";

import ChooseSlotModal from "@/components/reservations/ChooseSlotModal";
import MyReservationsList from "@/components/reservations/MyReservationsList";
import ReservationBookingModal from "@/components/reservations/ReservationBookingModal";
import ReservationDurationSelector from "@/components/reservations/ReservationDurationSelector";
import { useSlotPricePreviewCredits } from "@/components/reservations/useSlotPricePreview";
import LRButton from "@/components/ui/LRButton";
import {
  type AvailableSlot,
  type ReservationDuration,
} from "@/lib/quantum/reservations";
import { useState } from "react";

// Reservation content from ReservationBackendModal, laid out as stacked
// sections instead of the modal's nested book/mine tabs — a full page has
// the room to show both at once.
export default function CepheusReservationTab() {
  const [duration, setDuration] = useState<ReservationDuration>(15);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedSlot, setPickedSlot] = useState<AvailableSlot | null>(null);
  const [justBooked, setJustBooked] = useState(false);

  const { priceLabel } = useSlotPricePreviewCredits(duration);

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

      <div className="block lg:flex">
        <div className="default-radius border border-gray-100 bg-gray-100 p-5">
          <h2 className="text-lg font-bold text-gray-800">Book a slot</h2>
          {justBooked ? (
            <p className="text-sm text-gray-600">
              Reservation confirmed — see it under &quot;My reservations&quot;.
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-500">
                Booking slots are available in 15-minute increments, with 30-
                and 60-minute windows consisting of consecutive blocks.
              </p>
              <ReservationDurationSelector
                duration={duration}
                onDurationChange={setDuration}
              />
              <LRButton
                variant="primary"
                className="mt-4"
                onClick={() => setPickerOpen(true)}
              >
                {priceLabel
                  ? `Choose a ${duration} min slot for ${priceLabel} credits`
                  : "Choose a slot"}
              </LRButton>
            </>
          )}
        </div>
      </div>

      {pickerOpen && (
        <ChooseSlotModal
          duration={duration}
          onClose={() => setPickerOpen(false)}
          onPick={(slot) => {
            setPickerOpen(false);
            setPickedSlot(slot);
          }}
        />
      )}

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
