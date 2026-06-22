import ApiTokenCard from "@/components/overview/ApiTokenCard";

export default function Home() {
  const token = process.env.LR_TOKEN ?? "";

  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="mb-8 text-sm text-gray-600">
        Your gateway to quantum computing. Explore our backends, manage your account, and start
        running quantum circuits today.
      </p>

      <section>
        <h2 className="mb-1 text-sm font-medium text-gray-700">API Access Token</h2>
        <p className="mb-3 text-xs text-gray-500">
          Use this token to authenticate requests to the LightRider API.
        </p>
        <ApiTokenCard token={token} />
      </section>
    </div>
  );
}
