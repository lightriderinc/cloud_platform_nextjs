import { handleSignIn, handleSignOut } from "@/app/actions/auth";
import { getDisplayName, getSession } from "@/lib/auth/session";
import { resolveAvatarSources } from "@/lib/avatar";
import LoginButton from "./auth/LoginButton";
import UserCard from "./UserCard";

export default async function AuthenticationSection({
  dropdown = false,
}: {
  dropdown?: boolean;
}) {
  const { isAuthenticated, userInfo } = await getSession();

  if (!isAuthenticated) {
    return <LoginButton onSignIn={handleSignIn} />;
  }

  const displayName = await getDisplayName();

  // Seeded off the raw display name (not the "Account" placeholder below) so
  // the generated fallback matches the one the account page renders.
  const { src, fallbackSrc } = resolveAvatarSources({
    picture: userInfo?.picture,
    name: displayName,
    email: userInfo?.email,
  });

  return (
    <UserCard
      name={displayName ?? "Account"}
      avatarUrl={src}
      fallbackAvatarUrl={fallbackSrc}
      dropdown={dropdown}
      onSignOut={handleSignOut}
    />
  );
}
