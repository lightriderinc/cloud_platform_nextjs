import InviteHistory from "@/components/billing/InviteHistory";
import SendInvite from "@/components/billing/SendInvite";
import RewardsBanner from "@/components/rewards/RewardsBanner";

export default function RewardsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Rewards</h1>
      <p className="mb-12 text-sm text-gray-600">
        Earn rewards for inviting new people to Light Rider.
      </p>

      <div className="block mb-12">
        <RewardsBanner />
      </div>

      <div className="flex flex-col gap-12">
        <div className="block lg:flex lg:max-w-[700px]">
          <SendInvite />
        </div>

        <div>
          <h2 className="mb-4 text-xl font-bold text-gray-600">
            Invites &amp; rewards history
          </h2>
          <InviteHistory />
        </div>
      </div>
    </div>
  );
}
