import { logtoConfig } from "@/app/logto";
import { getLogtoContext } from "@logto/next/server-actions";

export type AccessTier = "Pro" | "Basic";

const PRO_ROLE = "Pro";

export function resolveAccessTier(roles: string[] | undefined): AccessTier {
  return roles?.includes(PRO_ROLE) ? "Pro" : "Basic";
}

export async function getAccessTier(): Promise<AccessTier> {
  const { claims } = await getLogtoContext(logtoConfig);
  return resolveAccessTier(claims?.roles as string[] | undefined);
}

export async function isPro(): Promise<boolean> {
  return (await getAccessTier()) === "Pro";
}
