const CHIPLET_COUNT = 12;
const QUBITS_PER_CHIPLET = 9;
const CORRIDOR_ROW_COUNT = 6;

// Placeholder shown while topology data is still loading. Markup mirrors
// TopologyExplorer's stat strip / processor map / corridor ranking / detail
// panel layout.
export default function TopologyExplorerSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="default-radius bg-gray-50 p-4">
            <div className="h-3.5 w-20 rounded bg-gray-200" />
            <div className="mt-2 h-5 w-16 rounded bg-gray-200" />
            <div className="mt-1.5 h-3 w-24 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="default-radius border-2 border-gray-50 bg-white p-4">
            <div className="mb-3 h-4 w-32 rounded bg-gray-100" />
            <div className="mx-auto grid max-w-md grid-cols-3 gap-4 p-3">
              {Array.from({ length: CHIPLET_COUNT }).map((_, i) => (
                <div key={i} className="default-radius border border-gray-100 bg-gray-100 p-1.5">
                  <div className="mb-1 h-3 w-10 rounded bg-gray-200" />
                  <div className="grid grid-cols-3 gap-1">
                    {Array.from({ length: QUBITS_PER_CHIPLET }).map((_, j) => (
                      <div key={j} className="aspect-square default-radius bg-gray-200" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="default-radius border-2 border-gray-50 bg-white p-4">
            <div className="mb-6 h-4 w-72 rounded bg-gray-100" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: CORRIDOR_ROW_COUNT }).map((_, i) => (
                <div key={i} className="h-3.5 w-full rounded bg-gray-100" />
              ))}
            </div>
          </div>
        </div>

        <div className="default-radius bg-gray-50 p-4">
          <div className="mb-3 h-4 w-16 rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="mt-1.5 h-3 w-3/4 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
