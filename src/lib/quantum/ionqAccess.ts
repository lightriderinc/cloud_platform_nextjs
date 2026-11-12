import { hasUnlockedCredits } from "@/lib/billing/planCheck";

/**
 * Who may run jobs on IonQ's real Forte QPUs. The one place that rule lives:
 * the submit route asks this, so a future premium rule changes here only.
 *
 * Today it is the same rule as every other real QPU: the account has
 * unlocked credits (bought credits, or received them from another user;
 * the free signup grant alone doesn't count). The submit modal mirrors it
 * client side with `hasUnlocked` from /api/billing/credits, so a change here
 * should be reflected there too.
 */
export async function canUseIonqQpu(customerId: string): Promise<boolean> {
  return hasUnlockedCredits(customerId);
}
