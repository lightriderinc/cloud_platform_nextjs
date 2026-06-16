import BackendCatalog from "@/components/backends/BackendCatalog";
import { placeholderBackends } from "@/data/backends";

export default function BackendsPage() {
  const onlineCount = placeholderBackends.filter(
    (backend) => backend.status === "online",
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Backends</h1>
      <p className="text-sm text-gray-600">
        QPUs and simulators available to run your circuits.
      </p>
      <p className="mb-6 text-xs text-gray-500">
        {placeholderBackends.length} Backends, {onlineCount} Online
      </p>

      <BackendCatalog backends={placeholderBackends} />
    </div>
  );
}
