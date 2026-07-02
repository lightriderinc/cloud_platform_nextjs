export default function JobsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Jobs</h1>
      <p className="mb-6 text-sm text-gray-600">
        Track and manage your submitted jobs.
      </p>
      {/* <JobsTable /> */}

      <div className="default-radius border border-dashed border-gray-300 p-16 text-center text-sm text-gray-500">
        Jobs you submit will appear here. You can track their status and view results once they complete.
      </div>
    </div>
  );
}
