import BackendConnectSectionSkeleton from "@/components/backends/BackendConnectSectionSkeleton";

// Placeholder shown while Cepheus's backend data is still loading. Markup
// mirrors CepheusConnectionTab's heading + BackendConnectSection layout.
export default function CepheusConnectionTabSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <div className="mb-4 h-6 w-64 animate-pulse rounded bg-gray-100" />
        <BackendConnectSectionSkeleton />
      </div>
    </div>
  );
}
