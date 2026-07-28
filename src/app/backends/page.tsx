import BackendCatalog from "@/components/backends/BackendCatalog";
import { getSession } from "@/lib/auth/session";

export default async function BackendsPage() {
  const { isAuthenticated } = await getSession();

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-gray-700">Backends</h1>
      <p className="mb-12 text-sm text-gray-600">
        QPUs and simulators available to run circuits.
      </p>

      <div>
        <BackendCatalog isAuthenticated={isAuthenticated} />
      </div>
    </div>
  );
}
