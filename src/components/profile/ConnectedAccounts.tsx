import type { LinkedSocialIdentity } from "@/lib/logto-account";
import { getSocialProviderMeta } from "./socialProviders";

type Props = {
  /** Flattened social identities from `normalizeSocialIdentities`. */
  identities: LinkedSocialIdentity[];
};

/**
 * Read-only "Connected accounts" section for the account page. Lists the social
 * providers a user has linked (e.g. Google, GitHub) so social-registered users
 * can see how they sign in. Renders nothing when there are no linked accounts,
 * so callers can include it unconditionally.
 *
 * Mirrors the section/row styling used by ProfileActions to stay visually
 * consistent with the rest of the account page.
 */
export default function ConnectedAccounts({ identities }: Props) {
  if (identities.length === 0) return null;

  return (
    <div className="flex flex-col mb-5">
      <div className="flex w-full mb-5">
        <h2 className="text-xl font-bold text-gray-500">Connected accounts</h2>
      </div>
      <div className="flex flex-col default-radius divide-y divide-gray-100 mb-8 max-w-3xl bg-gray-50 px-4 py-1">
        {identities.map(({ target, handle }) => {
          const { label, Icon } = getSocialProviderMeta(target);
          return (
            <div
              key={target}
              className="flex items-center py-3 gap-4 min-w-0"
            >
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center default-radius border border-gray-200 bg-white text-gray-700">
                <Icon aria-hidden className="text-lg" />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-gray-700">{label}</span>
                {handle && (
                  <span className="text-sm text-gray-400 truncate">{handle}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
