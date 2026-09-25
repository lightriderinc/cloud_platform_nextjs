import InviteHistory from "@/components/billing/InviteHistory";
import SendInvite from "@/components/billing/SendInvite";

export default function RewardsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700">Rewards</h1>
      <p className="mb-12 text-sm text-gray-600">
        Invite people to Light Rider. When someone you invited runs their first
        real quantum job or buys credits, you both earn 1000 credits.
      </p>

      <div className="flex flex-col gap-12">
        <div className="block lg:flex">
          <SendInvite />
        </div>

        <div>
          <h2 className="mb-4 text-xl font-bold text-gray-600">
            Invites &amp; rewards
          </h2>
          <InviteHistory />
        </div>
      </div>
    </div>
  );
}
