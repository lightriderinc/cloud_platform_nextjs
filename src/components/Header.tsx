import Image from "next/image";
import Link from "next/link";
import MobileMenu from "./MobileMenu";
import UserCard from "./UserCard";

export default function Header() {
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
        <UserCard className="hidden lg:flex" />
        <MobileMenu />
      </div>
    </header>
  );
}
