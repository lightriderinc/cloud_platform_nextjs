import JobsTable from "@/components/jobs/JobsTable";

export default function JobsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Jobs</h1>
      <p className="mb-6 text-sm text-gray-600">Track and manage your submitted jobs.</p>
      <JobsTable />
    </div>
  );
}
