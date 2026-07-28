import Link from "next/link";
import { IconType } from "react-icons";
import { MdArrowForward, MdArrowOutward } from "react-icons/md";

interface PricingNavCardProps {
  href: string;
  title: string;
  description?: string;
  icon: IconType;
  external?: boolean;
}

export default function PricingNavCard({
  href,
  title,
  icon: Icon,
  external,
  description,
}: PricingNavCardProps) {
  return (
    <Link
      href={href}
      className="flex w-128 group"
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      <div className="flex flex-col h-full w-full justify-between bg-gray-100 p-5 border border-gray-100 default-radius card-hover-primary gap-3">
        <div className="flex flex-col gap-3">
          <Icon className="text-5xl text-gray-200" />
          <h2 className="flex items-center gap-1 text-md font-semibold text-gray-800">
            {title} {external && <MdArrowOutward />}
          </h2>
          <p className="text-sm text-gray-600">{description}</p>
        </div>

        <div className="flex flex-row justify-end">
          <MdArrowForward className="text-xl text-gray-400 transition-colors duration-150 group-hover:text-[var(--brand-primary)]" />
        </div>
      </div>
    </Link>
  );
}
