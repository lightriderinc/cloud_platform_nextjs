import DashboardDemoCircuit from "@/components/dashboard/DashboardDemoCircuit";
import DashboardDemoEntropy from "@/components/dashboard/DashboardDemoEntopy";
import InfoBox from "@/components/InfoBox";

export default function Home() {
  // const token = process.env.LR_TOKEN ?? "";

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-700">Dashboard</h1>
        <p className="mb-12 text-sm text-gray-600">
          Your gateway to quantum computing. Explore our services and
          applications, and start running quantum circuits today.
        </p>

        {/* <div className="flex flex-col-reverse gap-2 lg:flex-row md:justify-between">
        <div className="w-full min-w-50 bg-gray-100 p-4 rounded border border-gray-200">
          <DashboardOverview />
        </div>

        <div className="w-full lg:w-auto bg-gray-100 p-4 rounded border border-gray-200">
          <section>
            <h2 className="mb-1 text-sm font-medium text-gray-700">API Access Token</h2>
            <p className="mb-6 text-xs text-gray-500">
              Use this token to authenticate requests to the LightRider API.
            </p>
            <ApiTokenCard token={token} />
          </section>
        </div>
      </div> */}

        <div>
          <h2 className="mb-3 text-xl font-bold text-gray-600">
            Getting started
          </h2>
          <InfoBox>
            The Light Rider cloud quantum platform is currently in active
            development. <br />
            All features will be fully available upon official launch. Below is
            a limited demo intended to provide a preview of select
            functionality.
          </InfoBox>
        </div>
        <div className="flex flex-row gap-4 mt-6">
          <DashboardDemoEntropy />
          <DashboardDemoCircuit />
        </div>
      </div>
      <div className="flex flex-row gap-3 w-full justify-end pt-6 pb-2">
        <a className="text-xs text-gray-500" href="/privacy">Privacy policy</a>
        <a className="text-xs text-gray-500" href="/terms-of-use">Terms of Use</a>
      </div>
    </div>
  );
}
