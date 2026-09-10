import DashboardUpdateCard from "./DashboardUpdateCard";

export default function DashboardUpdatesSection() {
  return (
    <div className="border-2 border-gray-50 p-4 mb-8">
      <h2 className="text-lg font-semibold text-gray-400 mb-4 inline-flex items-center gap-2">
        Platform updates
        {/* <FaStarOfLife className="text-sm text-gray-200" /> */}
      </h2>
      {/* There should'nt be more than 2 updates at a time */}
      <div className="flex flex-col gap-2">
        <DashboardUpdateCard
          href="/backends/rigetti-cepheus-1-108q?tab=experiments"
          color="lime"
          date="2024-09-12"
          title="Experiments available on Cepheus-1-108Q"
          description="Experiments are specific use-cases designed to help you explore the unique capabilities of the device and understand how to best utilize it for your applications."
        />
        <DashboardUpdateCard
          href="/backends/rigetti-cepheus-1-108q"
          color="purple"
          date="2024-08-27"
          title="Rigetti Cepheus-1-108Q Live"
          description="Rigetti's 108-qubit quantum processor is now available for access from the platform and SDK."
        />
      </div>
    </div>
  );
}
