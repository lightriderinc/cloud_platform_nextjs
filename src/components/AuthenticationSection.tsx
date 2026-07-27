import { handleSignIn } from "@/app/actions/auth";
import { getDisplayName, getSession } from "@/lib/auth/session";
import LoginButton from "./auth/LoginButton";
import UserCard from "./UserCard";

export default async function AuthenticationSection() {
  const { isAuthenticated } = await getSession();

  return (
    <>
      {/* Desktop: account button. Mobile: hamburger that opens the menu. */}
      {/* <UserCard className="hidden lg:flex" /> */}
      {!isAuthenticated && (
        <LoginButton onSignIn={handleSignIn} />
      )}
      {isAuthenticated && (
        <UserCard
          name={(await getDisplayName()) ?? "Account"}
        />
      )}
    </>
  );
}