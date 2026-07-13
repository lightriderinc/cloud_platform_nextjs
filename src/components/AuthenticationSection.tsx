import { handleSignIn } from "@/app/actions/auth";
import { logtoConfig } from "@/app/logto";
import { getLogtoContext } from "@logto/next/server-actions";
import LoginButton from "./auth/LoginButton";
import UserCard from "./UserCard";

export default async function AuthenticationSection() {
  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);

  return (
    <>
      {/* Desktop: account button. Mobile: hamburger that opens the menu. */}
      {/* <UserCard className="hidden lg:flex" /> */}
      {!isAuthenticated && (
        <LoginButton onSignIn={handleSignIn} />
      )}
      {isAuthenticated && (
        <UserCard
          name={claims?.name ?? "Account"}
          email={claims?.email ?? undefined}
        />
      )}
    </>
  );
}
