import AccessTokensPanel from "./AccessTokensPanel";

export default function TokensPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Access Tokens</h1>
      <p className="mb-6 text-sm text-gray-600">
        Access and manage your Light Rider access token.
      </p>

      <AccessTokensPanel />
    </div>
  );
}
