import Link from "next/link";
import { IconType } from "react-icons";
import { MdArrowOutward } from "react-icons/md";

interface WelcomePageCardProps {
  href: string;
  title: string;
  icon: IconType;
  external?: boolean;
  description?: string;
}

export default function WelcomePageCard({
  href,
  title,
  icon: Icon,
  external,
  description,
}: WelcomePageCardProps) {
  return (
    <Link
      href={href}
      className="flex w-64"
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
    >
      <div className="flex flex-col h-full w-full bg-gray-100 p-5 border border-gray-100 default-radius card-hover-primary gap-3">
        <Icon className="text-5xl text-gray-200" />
        <h3 className="flex items-center gap-1 text-md font-medium">
          {title} {external && <MdArrowOutward />}
        </h3>
        {description && (
          <div>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        )}
      </div>
    </Link>
  );
}
