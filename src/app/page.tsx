import ApiTokenCard from "@/components/overview/ApiTokenCard";
import DashboardOverview from "@/components/overview/DashboardOverview";

export default function Home() {
  const token = process.env.LR_TOKEN ?? "";

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mb-12 text-sm text-gray-600">
        Your gateway to quantum computing. Explore our backends, and start
        running quantum circuits today.
      </p>

      <div className="flex gap-2 justify-between">
        <div className="w-full min-w-50 bg-gray-100 p-4 rounded border border-gray-200">
          <DashboardOverview />
        </div>

        <div className="bg-gray-100 p-4 rounded border border-gray-200">
          <section>
            <h2 className="mb-1 text-sm font-medium text-gray-700">API Access Token</h2>
            <p className="mb-6 text-xs text-gray-500">
              Use this token to authenticate requests to the LightRider API.
            </p>
            <ApiTokenCard token={token} />
          </section>
        </div>
      </div>
    </div>
  );
}
