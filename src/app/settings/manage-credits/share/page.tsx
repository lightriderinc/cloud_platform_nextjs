import ShareCredits from "@/components/billing/ShareCredits";
import TransferHistory from "@/components/billing/TransferHistory";
import BackButton from "@/components/ui/BackButton";

export default function SharePage() {
  return (
    <div>
      <BackButton href="/settings/manage-credits" previousPageName="Manage Credits" />
      <h1 className="text-2xl font-semibold text-gray-700">Share Credits</h1>
      <p className="mb-12 text-sm text-gray-600">
        Send compute credits to other Light Rider users.
      </p>

      <div className="flex flex-col gap-12">
        <div className="block lg:flex lg:max-w-[700px]">
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
