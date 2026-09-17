import Link from "next/link";
import { IconType } from "react-icons";
import { MdArrowForward } from "react-icons/md";

export default function ClassroomBoardCourseCard({
  href,
  icon: Icon,
  title,
  description,
  badges,
  comingSoon = false,
}: {
  href: string;
  icon: IconType;
  title: string;
  description: string;
  badges: string[];
  comingSoon?: boolean;
}) {
  return (
    <Link
      className="flex flex-col border-2 rounded-lg border-gray-200 p-4 justify-between gap-2 cursor-pointer hover:bg-emerald-900 hover:border-[var(--brand-primary-light)] transition duration-150 group"
      href={href}
    >
      <div className="flex flex-col gap-4">
        <Icon className="text-5xl text-gray-100 opacity-40" />

        <h3 className="text-2xl font-semibold handwritten text-gray-100">
          {title}
        </h3>
        <p className="handwritten text-white">{description}</p>
        <div className="flex flex-col gap-2">
          <span className="text-md handwritten text-gray-100">
            You&apos;ll learn about:
          </span>
          <div className="flex flex-row flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className="text-sm handwritten text-gray-50 border border-gray-200 py-0.5 px-2 rounded-lg bg-green-800 transition duration-150"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
      {comingSoon ? (
        <span className="text-lg self-end handwritten text-gray-100 opacity-75">
          Coming soon
        </span>
      ) : (
        <MdArrowForward className="text-2xl text-gray-100 self-end group-hover:text-[var(--brand-primary-light)] transition duration-150" />
      )}
    </Link>
  );
}
