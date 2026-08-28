// Placeholder shown while BackendConnectSection's data is still loading.
// Markup mirrors its snippet + action-buttons layout.
export default function BackendConnectSectionSkeleton() {
  return (
    <div className="mt-3 flex flex-col gap-3 animate-pulse">
      <div className="h-4 w-72 rounded bg-gray-100" />
      <div className="relative mb-6 default-radius bg-gray-200 p-4">
        <div className="flex flex-col gap-4">
          <div className="h-3 w-3/4 rounded bg-gray-100" />
          <div className="h-3 w-1/2 rounded bg-gray-100" />
          <div className="h-3 w-5/6 rounded bg-gray-100" />
          <div className="h-3 w-2/3 rounded bg-gray-100" />
          <div className="h-3 w-1/3 rounded bg-gray-100" />
          <div className="h-3 w-4/5 rounded bg-gray-100" />
          <div className="h-3 w-3/5 rounded bg-gray-100" />
        </div>
      </div>
      <div className="flex flex-row gap-3">
        <div className="h-9 w-48 rounded default-radius bg-gray-100" />
        <div className="h-9 w-40 rounded default-radius bg-gray-100" />
      </div>
    </div>
  );
}
