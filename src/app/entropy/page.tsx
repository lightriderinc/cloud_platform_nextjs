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
          Requests are served live by the Light Rider entropy distribution
          service (EMS). Sources marked &ldquo;Available at Launch&rdquo; are
          still coming online.
        </InfoBox>
      </div>

      <EntropyConsole />
    </div>
  );
}
