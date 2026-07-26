import JobsList from "@/components/jobs/JobsList";

export default function JobsPage() {
  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-gray-700">Jobs</h1>
      <p className="mb-6 text-sm text-gray-600">
        Track and manage your submitted jobs — from the dashboard demo, or
        via your Light Rider API key (Settings → Access Tokens).
      </p>
      <JobsList />
    </div>
  );
}
