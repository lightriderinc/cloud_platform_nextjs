// Placeholder shown while Cepheus's backend data is still loading. Markup
// mirrors CepheusDetailsPanel's description/pricing row and spec grid.
export default function CepheusDetailsPanelSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <div className="h-3.5 w-full max-w-md rounded bg-gray-100" />
          <div className="h-3.5 w-2/3 max-w-sm rounded bg-gray-100" />
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <div className="h-4 w-40 rounded bg-gray-100" />
          <div className="h-4 w-32 rounded bg-gray-100" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 p-4 bg-gray-50">
            <div className="h-3.5 w-20 rounded bg-gray-200" />
            <div className="h-5 w-14 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
