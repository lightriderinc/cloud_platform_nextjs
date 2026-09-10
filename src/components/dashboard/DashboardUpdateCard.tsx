import Link from "next/link";
import { MdArrowForward } from "react-icons/md";

type DashboardUpdateCardColor = "lime" | "purple" | "violet" | "indigo" | "fuchsia" ;

interface DashboardUpdateCardProps {
  href: string;
  title: string;
  date: string;
  description: string;
  color: DashboardUpdateCardColor;
}

const colorClasses: Record<DashboardUpdateCardColor, string> = {
  "lime": "border-lime-200 bg-lime-200",
  "purple": "border-purple-200 bg-purple-200",
  "violet": "border-violet-200 bg-violet-200",
  "indigo": "border-indigo-200 bg-indigo-200",
  "fuchsia": "border-fuchsia-200 bg-fuchsia-200",
};

export default function DashboardUpdateCard({
  href,
  title,
  date,
  description,
  color,
}: DashboardUpdateCardProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-2 p-3 border ${colorClasses[color]} default-radius group card-hover-primary`}
    >
      <div>
        <h3 className="text-md font-semibold text-gray-700">{title}</h3>
        <span className="text-xs text-gray-600">{date}</span>
      </div>

      <p className="text-sm mb-4">{description}</p>
      <div className="flex flex-row justify-end">
        <div className="text-sm font-medium text-gray-700 inline-flex items-center gap-2 group-hover:text-[var(--brand-primary)] transition duration-150">
          Check it out <MdArrowForward />
        </div>
      </div>
    </Link>
  );
}
