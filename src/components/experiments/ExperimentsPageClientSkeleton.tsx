// Placeholder shown while ExperimentsPageClient's experiment catalog is
// still loading. Mirrors the "Experiment" dropdown label + select control --
// no experiment is selected yet at this point, so there's nothing below it
// to skeletonize.
export default function ExperimentsPageClientSkeleton() {
  return (
    <div className="animate-pulse border-b border-gray-100 pb-4">
      <div className="max-w-sm">
        <div className="mb-1.5 h-3.5 w-24 rounded bg-gray-100" />
        <div className="h-9 w-full rounded default-radius bg-gray-100" />
      </div>
    </div>
  );
}
