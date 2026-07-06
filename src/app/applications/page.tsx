import ApplicationCard from "@/components/applications/ApplicationCard";
import { FaDiceD20 } from "react-icons/fa6";
import { PiPasswordFill } from "react-icons/pi";


export default function ApplicationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Applications</h1>
      <p className="text-sm text-gray-600">
        Explore real-world use cases, powered by quantum.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 mt-12">
        <ApplicationCard
          title="True random dice roll"
          description="A dice roller powered by quantum entropy, delivering truly random results."
          icon={FaDiceD20}
          tag="Demo"
        />
        <ApplicationCard
          title="Secure password generator"
          description="Generate strong, unpredictable passwords powered by quantum randomness."
          icon={PiPasswordFill}
          tag="Demo"
        />
      </div>
    </div>
  );
}
