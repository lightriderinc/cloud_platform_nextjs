import { getLogtoContext, signIn } from "@logto/next/server-actions";
import Image from "next/image";
import Link from "next/link";
import { logtoConfig } from "@/app/logto";
import LoginButton from "./auth/LoginButton";
import MobileMenu from "./MobileMenu";

// Server component: reads Logto auth state on the server so the Log in
// button renders only for signed-out visitors, with no client-side flash.
export default async function Header() {
  const { isAuthenticated } = await getLogtoContext(logtoConfig);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4">
      <div className="flex items-center gap-2">
        <Link href="/">
          <Image
            src="/Lightrider-logo.svg"
            alt="Lightrider logo"
            width={190}
            height={32}
          />
        </Link>
      </div>

      <div className="flex items-center gap-1">
        {/* Desktop: account button. Mobile: hamburger that opens the menu. */}
        {/* <UserCard className="hidden lg:flex" /> */}
        <a
          href="https://lightriderinc.com/early-access"
          target="_blank"
          rel="noreferrer"
        >
          <button
            type="button"
            className="hidden lg:flex default-radius px-3 py-2 text-sm font-semibold text-brand-primary cursor-pointer btn-outline-brand transition-opacity min-w-[110px]"
          >
            Get early access
          </button>
        </a>
        {!isAuthenticated && (
          <LoginButton
            onSignIn={async () => {
              "use server";

              await signIn(logtoConfig);
            }}
          />
        )}
        <MobileMenu />
      </div>
    </header>
  );
}
