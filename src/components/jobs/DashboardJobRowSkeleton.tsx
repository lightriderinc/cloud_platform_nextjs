export default function DashboardJobRowSkeleton() {
  return (
    <div className="flex w-full items-end justify-between gap-4 default-radius border border-gray-100 bg-gray-100 p-3">
      <div className="min-w-0">
        <div className="h-3 w-24 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-32 rounded bg-gray-200" />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="h-5 w-16 rounded bg-gray-200" />
        <div className="h-3 w-24 rounded bg-gray-200" />
      </div>
    </div>
  );
}
