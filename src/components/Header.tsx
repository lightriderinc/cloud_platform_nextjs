import Image from "next/image";
import Link from "next/link";
import MobileMenu from "./MobileMenu";

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
        {/* <UserCard className="hidden lg:flex" /> */}
        <button
          type="button"
          className="hidden lg:flex default-radius px-3 py-2 text-sm font-semibold text-brand-primary cursor-pointer btn-outline-brand transition-opacity min-w-[110px]"
        >
          Get early access
        </button>
        <MobileMenu />
      </div>
    </header>
  );
}
