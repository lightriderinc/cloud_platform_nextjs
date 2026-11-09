import SignInRequired from "@/components/auth/SignInRequired";
import JobsList from "@/components/jobs/JobsList";
import { getSession } from "@/lib/auth/session";

export default async function JobsPage() {
  const { isAuthenticated } = await getSession();

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-gray-700">Jobs</h1>
      <p className="mb-12 text-sm text-gray-600">
        Track and manage your submitted jobs.
      </p>

      {!isAuthenticated && <SignInRequired target="your jobs" />}
      {isAuthenticated && <JobsList />}
    </div>
  );
}
