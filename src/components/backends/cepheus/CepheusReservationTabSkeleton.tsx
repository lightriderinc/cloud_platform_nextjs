import ReservationSlotPickerSkeleton from "@/components/reservations/ReservationSlotPickerSkeleton";

// Placeholder shown while Cepheus's backend data is still loading. Markup
// mirrors CepheusReservationTab's description + reservations list + slot
// picker layout.
export default function CepheusReservationTabSkeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="flex max-w-2xl flex-col gap-2">
        <div className="h-3.5 w-full rounded bg-gray-100" />
        <div className="h-3.5 w-5/6 rounded bg-gray-100" />
        <div className="h-3.5 w-2/3 rounded bg-gray-100" />
      </div>

      <div>
        <div className="mb-4 h-6 w-40 rounded bg-gray-100" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded default-radius bg-gray-100" />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-4 h-6 w-28 rounded bg-gray-100" />
        <ReservationSlotPickerSkeleton />
      </div>
    </div>
  );
}
