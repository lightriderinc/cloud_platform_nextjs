import ApplicationsGrid from "@/components/applications/ApplicationsGrid";

export default function ApplicationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Applications</h1>
      <p className="text-sm text-gray-600">
        Explore real-world use cases, powered by quantum.
      </p>
      <ApplicationsGrid />
    </div>
  );
}
