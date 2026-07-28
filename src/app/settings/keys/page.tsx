import InfoBox from "@/components/InfoBox";
import AccessTokensPanel from "./AccessTokensPanel";

export default function TokensPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">API Keys</h1>
      <p className="mb-12 text-sm text-gray-600">
        Access and manage your Light Rider API keys.
      </p>
      <div className="mb-4">
        <InfoBox>
          Your Light Rider API Key is used to authenticate and track your job
          submissions. <br /> Keep it secret to avoid unauthorized access.
        </InfoBox>
      </div>
      <div>
        <AccessTokensPanel />
      </div>
    </div>
  );
}
