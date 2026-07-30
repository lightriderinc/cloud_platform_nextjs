import CreditsSummary from "@/components/billing/CreditsSummary";
import LowCreditsBanner from "@/components/billing/LowCreditsBanner";
import DashboardDemoCircuit from "@/components/dashboard/DashboardDemoCircuit";
import DashboardDemoEntropy from "@/components/dashboard/DashboardDemoEntropy";
import DashboardLatestJobs from "@/components/dashboard/DashboardLatestJobs";
import WelcomePage from "@/components/WelcomePage";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { MdArrowForward, MdArrowOutward } from "react-icons/md";

export default async function Home() {
  // const token = process.env.LR_TOKEN ?? "";

  const { isAuthenticated } = await getSession();

  return (
    <div className="flex flex-col h-full justify-between animate-fade-in-up">
      {isAuthenticated && (
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
          <LowCreditsBanner />
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-gray-600">
              Compute tokens
            </h2>
            <div className="xl:w-1/2">
              <CreditsSummary />
            </div>
          </div>
          <div className="mb-8">
            <div className="flex flex-row justify-between">
              <h2 className="text-xl font-bold text-gray-600">
                Latest jobs
              </h2>
              <div className="mt-3 flex justify-end">
                <Link
                  href="/jobs"
                  className="text-sm font-medium text-gray-700 inline-flex items-center gap-2 hover:text-[var(--brand-primary)]"
                >
                  View all jobs <MdArrowForward />
                </Link>
              </div>
            </div>

            <div>
              <DashboardLatestJobs />
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-xl font-bold text-gray-600">
              Getting started
            </h2>
          </div>
          <div className="flex flex-col lg:flex-row gap-4">
            <DashboardDemoCircuit />
            <DashboardDemoEntropy />
          </div>
          {/* <div className="mt-4 flex">
          <GettingStartedChecklist />
        </div> */}
        </div>
      )}
      {!isAuthenticated && <WelcomePage />}

      <div className="flex flex-row gap-3 w-full justify-end pt-6 pb-2">
        <Link
          className="inline-flex items-center gap-1 text-xs text-gray-700 hover:text-gray-500"
          target="_blank"
          rel="noopener noreferrer"
          href="https://www.lightriderinc.com/platform-feedback"
        >
          Send feedback <MdArrowOutward />
        </Link>
        <a
          className="text-xs text-gray-700 hover:text-gray-500"
          href="/legal/privacy"
        >
          Privacy policy
        </a>
        <a
          className="text-xs text-gray-700 hover:text-gray-500"
          href="/legal/terms-of-use"
        >
          Terms of Use
        </a>
      </div>
    </div>
  );
}
