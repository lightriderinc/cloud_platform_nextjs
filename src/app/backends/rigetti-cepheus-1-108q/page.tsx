import CepheusDetailTabs from "@/components/backends/cepheus/CepheusDetailTabs";
import BackButton from "@/components/ui/BackButton";
import { getSession } from "@/lib/auth/session";

export default async function RigettiCepheusOnePage() {
  const { isAuthenticated } = await getSession();

  return (
    <div className="animate-fade-in-up">
      <BackButton href="/backends" previousPageName="Backends" />
      <h1 className="text-2xl font-semibold text-gray-700 mb-8">
        Rigetti Cepheus 1-108Q
      </h1>
      <CepheusDetailTabs isAuthenticated={isAuthenticated} />
    </div>
  );
}
