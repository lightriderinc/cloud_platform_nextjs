"use client";

import { useActiveSection } from "./useActiveSection";

export default function CourseTableOfContents({
  sections,
}: {
  sections: { id: string; title: string }[];
}) {
  const activeId = useActiveSection(sections);

  return (
    <nav className="sticky top-24 hidden self-start lg:block sticky-top">
      <span className="block text-sm font-semibold tracking-wide text-gray-500 mb-3">
        On this page
      </span>
      <ul className="flex flex-col gap-2 border-l border-gray-100">
        {sections.map((section) => {
          const isActive = section.id === activeId;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`-ml-px block border-l-2 py-1 pl-4 text-sm transition-colors duration-150 ${
                  isActive
                    ? "border-[var(--brand-primary-light)] font-medium text-[var(--brand-primary-light)]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
