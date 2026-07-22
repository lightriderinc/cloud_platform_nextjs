import EntropyConsole from "@/components/entropy/EntropyConsole";
import InfoBox from "@/components/InfoBox";

export const metadata = {
  title: "Get Entropy",
};

export default function EntropyPage() {
  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-gray-700">Get Entropy</h1>
      <p className="mb-6 text-sm text-gray-600">
        Generate certified entropy from hardware and beacon sources, then copy it
        straight into your workflow.
      </p>

      <div className="mb-6">
        <InfoBox>
          This is a preview demo — entropy is generated in your browser so you can
          explore the flow. <br />
          At launch, requests will be served by the Light Rider entropy
          distribution service.
        </InfoBox>
      </div>

      <EntropyConsole />
    </div>
  );
}
