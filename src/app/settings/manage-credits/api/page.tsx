import ApiPlansGrid from "@/components/billing/ApiPlansGrid";
import InfoBox from "@/components/InfoBox";

export default function ApiPricingPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">EaaS API Pricing</h1>
      <p className="mb-6 text-sm text-gray-600">
        Entropy-as-a-Service for developers and enterprises. Pay for what you
        use with generous monthly allowances and transparent overage pricing.
      </p>

      <InfoBox>
        Usage is metered per successful API call and reported to Stripe in
        real time. Overage charges beyond your plan&apos;s included calls
        appear on your next invoice automatically.
      </InfoBox>

      <div className="mt-6">
        <ApiPlansGrid />
      </div>

      <div className="mt-6 overflow-hidden default-radius border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 font-medium text-gray-700">Overage (all plans)</th>
              <th className="px-4 py-2 font-medium text-gray-700">Free</th>
              <th className="px-4 py-2 font-medium text-gray-700">Starter</th>
              <th className="px-4 py-2 font-medium text-gray-700">Developer</th>
              <th className="px-4 py-2 font-medium text-gray-700">Business</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-2 text-gray-600">Per call over included</td>
              <td className="px-4 py-2 text-gray-500">N/A</td>
              <td className="px-4 py-2 text-gray-700">$0.0005</td>
              <td className="px-4 py-2 text-gray-700">$0.00025</td>
              <td className="px-4 py-2 text-gray-700">$0.00015</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
