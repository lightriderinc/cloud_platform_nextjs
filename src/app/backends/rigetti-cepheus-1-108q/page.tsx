import BackButton from "@/components/ui/BackButton";

export default async function RigettiCepheusOnePage() {
  return (
    <div className="animate-fade-in-up">
      <BackButton href="/backends" previousPageName="Backends" />
      <h1 className="text-2xl font-semibold text-gray-700">
        Rigetti Cepheus 1-108Q
      </h1>
      <p className="mb-8 text-sm text-gray-600">
        Rigetti Cepheus-1-108Q is a superconducting quantum processor (Rigetti
        Ankaa family), with calibration data pulled live from Rigetti QCS.
      </p>
    </div>
  );
}
