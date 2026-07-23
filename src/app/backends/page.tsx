import BackendCatalog from "@/components/backends/BackendCatalog";
import InfoBox from "@/components/InfoBox";

export default function BackendsPage() {
  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-gray-700">Backends</h1>
      <p className="text-sm text-gray-600">
        QPUs and simulators available to run circuits.
      </p>
      <div className="mt-6">
        <InfoBox>
          Access to backends will be available at launch.
        </InfoBox>
      </div>
      <div className="mt-6">
        <BackendCatalog />
      </div>
    </div>
  );
}
