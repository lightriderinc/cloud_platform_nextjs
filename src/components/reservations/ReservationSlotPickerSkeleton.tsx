const VISIBLE_ROWS = 11;

// Placeholder shown while ReservationSlotPicker's availability data is still
// loading. Markup mirrors its timezone/legend header and the 3-day grid
// below (the duration selector lives outside this component now).
export default function ReservationSlotPickerSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="h-9 rounded default-radius bg-blue-50" />

      <div className="flex items-center justify-between">
        <div className="h-4 w-14 rounded bg-gray-100" />
        <div className="h-3 w-32 rounded bg-gray-100" />
        <div className="h-4 w-14 rounded bg-gray-100" />
      </div>

      <div className="max-h-72 overflow-hidden default-radius border-2 border-gray-50">
        <div className="grid" style={{ gridTemplateColumns: "56px repeat(3, minmax(64px, 1fr))" }}>
          <div className="border-b border-gray-50" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-b border-l-2 border-gray-50 px-1 py-1.5">
              <div className="mx-auto h-3 w-16 rounded bg-gray-100" />
            </div>
          ))}
          {Array.from({ length: VISIBLE_ROWS }).map((_, row) => (
            <div key={row} className="contents">
              <div className="border-t border-gray-100" style={{ height: 24 }} />
              {Array.from({ length: 3 }).map((_, col) => (
                <div
                  key={col}
                  className="border border-white bg-gray-100"
                  style={{ height: 24 }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
