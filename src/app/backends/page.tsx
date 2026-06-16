import BackendCatalog from "@/components/backends/BackendCatalog";
import { placeholderBackends } from "@/data/backends";

export default function BackendsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Backends</h1>
      <p className="text-sm text-gray-600">
        QPUs and simulators available to run your circuits.
      </p>

      <BackendCatalog backends={placeholderBackends} />
    </div>
  );
}
