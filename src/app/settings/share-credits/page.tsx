import ShareCredits from "@/components/billing/ShareCredits";
import TransferHistory from "@/components/billing/TransferHistory";

export default function ShareCreditsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Share Credits</h1>
      <p className="mb-12 text-sm text-gray-600">
        Send compute credits to other Light Rider users, and review every
        transfer you&apos;ve sent or received.
      </p>

      <div className="flex flex-col gap-12">
        <div className="block lg:flex">
          <ShareCredits />
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-600">
            Transfer history
          </h2>
          <TransferHistory />
        </div>
      </div>
    </div>
  );
}
