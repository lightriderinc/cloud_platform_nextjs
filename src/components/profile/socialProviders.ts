import type { IconType } from "react-icons";
import { FaGithub, FaGoogle, FaMicrosoft, FaApple } from "react-icons/fa6";

/**
 * Display metadata for the social connectors we surface on the account page,
 * keyed by the Logto connector `target`. Kept as data (not hardcoded in the
 * component) so new providers are a one-line addition and the same map can be
 * reused anywhere linked identities are shown.
 */
export type SocialProviderMeta = {
  label: string;
  Icon: IconType;
};

const SOCIAL_PROVIDERS: Record<string, SocialProviderMeta> = {
  google: { label: "Google", Icon: FaGoogle },
  github: { label: "GitHub", Icon: FaGithub },
  microsoft: { label: "Microsoft", Icon: FaMicrosoft },
  apple: { label: "Apple", Icon: FaApple },
};

/**
 * Resolve display metadata for a connector target, falling back to a
 * capitalized label + generic-less handling so an unmapped provider still
 * renders sensibly instead of breaking the list.
 */
export function getSocialProviderMeta(target: string): SocialProviderMeta {
  const known = SOCIAL_PROVIDERS[target.toLowerCase()];
  if (known) return known;
  return {
    label: target.charAt(0).toUpperCase() + target.slice(1),
    Icon: FaGithub,
  };
}
