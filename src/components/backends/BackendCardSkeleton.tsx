// Placeholder card shown while a provider's live data is still loading, so the
// grid can render the backends that have arrived and fill in slower providers
// progressively. Markup mirrors BackendCard's summary layout.
export default function BackendCardSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col gap-3 default-radius border border-gray-100 bg-gray-100 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="h-4 w-32 rounded bg-gray-300" />
        <div className="h-5 w-14 rounded-full bg-gray-300" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-3.5 w-24 rounded bg-gray-300" />
        <div className="h-3.5 w-20 rounded bg-gray-300" />
      </div>
      <div className="mt-auto h-5 w-16 rounded bg-gray-300" />
    </div>
  );
}
