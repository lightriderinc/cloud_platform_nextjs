// Placeholder shown while Cepheus's backend data is still loading. Markup
// mirrors CepheusReservationTab's description + reservations list + "Book a
// slot" card (title, blurb, duration presets, and the choose-a-slot button)
// — the calendar itself only renders inside the "Choose a slot" modal once
// it's opened, so it isn't part of this initial-load skeleton.
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

      <div className="block lg:flex">
        <div className="w-full default-radius border border-gray-100 bg-gray-100 p-5 lg:w-auto">
          <div className="mb-4 h-5 w-24 rounded bg-gray-200" />

          <div className="mb-4 flex flex-col gap-2">
            <div className="h-3 w-72 max-w-full rounded bg-gray-200" />
            <div className="h-3 w-56 max-w-full rounded bg-gray-200" />
          </div>

          <div className="mb-1.5 h-3.5 w-16 rounded bg-gray-200" />
          <div className="mb-4 flex gap-2">
            <div className="h-8 w-16 rounded default-radius bg-gray-200" />
            <div className="h-8 w-16 rounded default-radius bg-gray-200" />
            <div className="h-8 w-16 rounded default-radius bg-gray-200" />
          </div>

          <div className="h-9 w-64 max-w-full rounded default-radius bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
