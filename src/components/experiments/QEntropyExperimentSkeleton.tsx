const CHIPLET_COUNT = 12;
const CELLS_PER_CHIPLET = 9;

// Placeholder shown while QEntropyExperiment's own chiplet pool/candidate
// data is still loading -- distinct from ExperimentsPageClientSkeleton
// (which covers the catalog/dropdown, before any experiment is even
// selected). Mirrors this experiment's mode toggle, its 3x4 chiplet grid
// (same layout as ChipletVisualPicker, and same per-chiplet label + 3x3
// qubit-cell treatment as TopologyExplorerSkeleton's processor map), and
// the configure/submit panel.
export default function QEntropyExperimentSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <div className="mb-4">
          <div className="mb-1.5 h-3.5 w-48 rounded bg-gray-100" />
          <div className="mb-1.5 flex gap-1">
            <div className="h-8 w-28 rounded default-radius bg-gray-100" />
            <div className="h-8 w-40 rounded default-radius bg-gray-100" />
          </div>
          <div className="h-3 w-64 rounded bg-gray-100" />
        </div>

        <div className="border-2 border-gray-50 p-4">
          <div className="mb-6 h-3.5 w-56 rounded bg-gray-100" />
          <div className="mx-auto grid max-w-md grid-cols-3 gap-4 p-3">
            {Array.from({ length: CHIPLET_COUNT }).map((_, i) => (
              <div key={i} className="default-radius border border-gray-100 bg-gray-100 p-1.5">
                <div className="mb-1 h-3 w-10 rounded bg-gray-200" />
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: CELLS_PER_CHIPLET }).map((_, j) => (
                    <div key={j} className="aspect-square default-radius bg-gray-200" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-4 default-radius border border-gray-50 bg-gray-50 p-4 lg:w-[320px] lg:shrink-0">
        <div className="h-5 w-40 rounded bg-gray-200" />
        <div>
          <div className="mb-1.5 h-3.5 w-28 rounded bg-gray-200" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-12 rounded default-radius bg-gray-200" />
            ))}
          </div>
        </div>
        <div className="h-9 w-full rounded default-radius bg-gray-200" />
      </div>
    </div>
  );
}
