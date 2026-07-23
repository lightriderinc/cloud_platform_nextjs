import CreditsTopUp from "@/components/billing/CreditsTopUp";

const RUNTIME_TIERS = [
  { range: "0 to 10 minutes", rate: "$5/sec", use: "Interactive apps, APIs, synthetic data, password generation, quantum randomness" },
  { range: "11 to 20 minutes", rate: "$4/sec", use: "Research, calibration, QEC testing, model exploration" },
  { range: "21 to 60 minutes", rate: "$3/sec", use: "Optimization, simulation, AI workflows, larger experiments" },
  { range: "1+ hour", rate: "Contact Sales", use: "Enterprise workloads, dedicated research, government use" },
];

export default function QuantumComputePricingPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">
        Quantum Compute Pricing
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        Quantum-powered applications priced by runtime, priority, and
        outcome. Most jobs complete in seconds.
      </p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-bold text-gray-800">
            Runtime pricing
          </h2>
          <div className="overflow-hidden default-radius border border-gray-200">
            <table className="w-full text-left text-sm">
              <tbody>
                {RUNTIME_TIERS.map((tier) => (
                  <tr key={tier.range} className="border-b border-gray-200 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                      {tier.range}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {tier.rate}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{tier.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Underlying QPU provider costs may be included or quoted separately
            depending on workload, backend, reservation type, and enterprise
            requirements.
          </p>
        </div>

        <div>
          <CreditsTopUp />
        </div>
      </div>
    </div>
  );
}
