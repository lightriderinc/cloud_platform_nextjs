import Link from "next/link";
import { MdArrowBack } from "react-icons/md";


interface BackButtonProps {
  href: string;
  previousPageName: string;
}

export default function BackButtion({
  href,
  previousPageName,
}: BackButtonProps) {
  return (
    <>
      <Link
        href={href}
        className="font-medium text-gray-500 inline-flex items-center hover:text-[var(--brand-primary)] mb-4"
      >
        <span className="inline-flex items-center gap-2 cursor-pointer">
          <MdArrowBack />
          <span className="text-sm font-medium">Back to {previousPageName}</span>
        </span>
      </Link>
    </>
  );
}
