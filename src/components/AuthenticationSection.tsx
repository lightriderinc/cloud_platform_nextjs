import { handleSignIn, handleSignOut } from "@/app/actions/auth";
import { getDisplayName, getSession } from "@/lib/auth/session";
import LoginButton from "./auth/LoginButton";
import UserCard from "./UserCard";

export default async function AuthenticationSection({
  dropdown = false,
}: {
  dropdown?: boolean;
}) {
  const { isAuthenticated } = await getSession();

  return (
    <>
      {/* Desktop: account button. Mobile: hamburger that opens the menu. */}
      {!isAuthenticated && (
        <LoginButton onSignIn={handleSignIn} />
      )}
      {isAuthenticated && (
        <UserCard
          name={(await getDisplayName()) ?? "Account"}
          dropdown={dropdown}
          onSignOut={handleSignOut}
        />
      )}
    </>
  );
}