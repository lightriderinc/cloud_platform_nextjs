import { logtoConfig } from "@/app/logto";
import { getLogtoContext } from "@logto/next/server-actions";

export type AccessTier = "Pro" | "Basic";

const PRO_ROLE = "Pro";

export function resolveAccessTier(roles: string[] | undefined): AccessTier {
  return roles?.includes(PRO_ROLE) ? "Pro" : "Basic";
}

export async function getAccessTier(): Promise<AccessTier> {
  const { userInfo, claims } = await getLogtoContext(logtoConfig, { fetchUserInfo: true });
  const roles =
    (userInfo?.roles as string[] | undefined) ??
    (claims?.roles as string[] | undefined);
  return resolveAccessTier(roles);
}

export async function isPro(): Promise<boolean> {
  return (await getAccessTier()) === "Pro";
}
