import Image from "next/image";
import Link from "next/link";
import AuthenticationSection from "./AuthenticationSection";
import MobileMenu from "./MobileMenu";

// Server component: reads Logto auth state on the server so the Log in
// button renders only for signed-out visitors, with no client-side flash.
export default async function Header() {
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

      <div className="flex items-center gap-1 mr-2">
        {/* Desktop: account button. Mobile: hamburger that opens the menu. */}
        {/* <UserCard className="hidden lg:flex" /> */}
        <div className="hidden lg:block">
          <AuthenticationSection />
        </div>
        <MobileMenu>
          <AuthenticationSection />
        </MobileMenu>
      </div>
    </header>
  );
}
