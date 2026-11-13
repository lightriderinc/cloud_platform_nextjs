import BackendCatalog from "@/components/backends/BackendCatalog";
import { getSession } from "@/lib/auth/session";

export const metadata = {
  title: "Backends | Light Rider Quantum",
};

export default async function BackendsPage() {
  const { isAuthenticated } = await getSession();

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-gray-700">Backends</h1>
      <p className="mb-8 text-sm text-gray-600">
        Run circuits on real quantum hardware and simulators from IQM, Rigetti
        and IonQ.
      </p>

      <div>
        <BackendCatalog isAuthenticated={isAuthenticated} />
      </div>
    </div>
  );
}
