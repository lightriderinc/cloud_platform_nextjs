import EnterpriseLeadForm from "@/components/billing/EnterpriseLeadForm";
import InfoBox from "@/components/InfoBox";

export default function EnterprisePricingPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">
        Enterprise & Government Pricing
      </h1>
      <p className="mb-6 text-sm text-gray-600">
        Custom solutions, mission-critical impact. For organizations with
        advanced requirements, Light Rider offers customized pricing,
        dedicated resources, and secure deployments.
      </p>

      <InfoBox>
        Enterprise and government deals are never self-serve: commercial
        accounts are set up via invoice or ACH, and government accounts go
        through direct contract only. Submitting this form does not charge
        anything — it starts a conversation with sales.
      </InfoBox>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="default-radius border border-gray-200 p-4">
            <h2 className="font-bold text-gray-800">Reserved QPU access</h2>
            <p className="text-sm text-gray-600">
              Guaranteed compute capacity with priority scheduling, higher
              limits, and predictable performance.
            </p>
          </div>
          <div className="default-radius border border-gray-200 p-4">
            <h2 className="font-bold text-gray-800">Dedicated entropy pools</h2>
            <p className="text-sm text-gray-600">
              Isolated, high-throughput entropy sources with custom
              configurations and guaranteed availability.
            </p>
          </div>
          <div className="default-radius border border-gray-200 p-4">
            <h2 className="font-bold text-gray-800">Secure deployments</h2>
            <p className="text-sm text-gray-600">
              On-prem, air-gapped, or hybrid deployment for the most
              sensitive environments.
            </p>
          </div>
        </div>

        <EnterpriseLeadForm />
      </div>
    </div>
  );
}
