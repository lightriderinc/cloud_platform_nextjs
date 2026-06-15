import Image from "next/image";
import Link from "next/link";

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

      <div className="flex items-center gap-3">
        {/* Placeholder notifications */}
        <button className="h-8 w-8 rounded-full bg-gray-200 text-sm">!</button>
        {/* Placeholder user menu */}
        <button className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-100">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-300">
            U
          </span>
          User Name
        </button>
      </div>
    </header>
  );
}
