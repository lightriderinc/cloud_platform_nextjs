import ExperimentsPageClient from "@/components/experiments/ExperimentsPageClient";
import { getSession } from "@/lib/auth/session";

export default async function ExperimentsPage() {
  const { isAuthenticated } = await getSession();

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-gray-700">Experiments</h1>
      <p className="mb-12 text-sm text-gray-600">
        Run a quantum experiment on Cepheus-1-108Q.
      </p>

      <ExperimentsPageClient isAuthenticated={isAuthenticated} />
    </div>
  );
}
