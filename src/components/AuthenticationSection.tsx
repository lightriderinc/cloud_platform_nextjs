import { handleSignIn } from "@/app/actions/auth";
import { isPro } from "@/lib/auth";
import { getSession } from "@/lib/auth/session";
import LoginButton from "./auth/LoginButton";
import UserCard from "./UserCard";

export default async function AuthenticationSection() {
  const { isAuthenticated, claims, userInfo } = await getSession();

  const userIsPro = await isPro();


  return (
    <>
      {/* Desktop: account button. Mobile: hamburger that opens the menu. */}
      {/* <UserCard className="hidden lg:flex" /> */}
      {!isAuthenticated && (
        <LoginButton onSignIn={handleSignIn} />
      )}
      {isAuthenticated && (
        <UserCard
          name={userInfo?.name ?? claims?.name ?? "Account"}
          role={userIsPro ? "Pro user" : "Basic user"}
        />
      )}
    </>
  );
}
