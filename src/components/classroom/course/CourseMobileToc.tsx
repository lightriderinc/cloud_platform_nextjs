"use client";

import { useActiveSection } from "./useActiveSection";

export default function CourseMobileToc({
  sections,
}: {
  sections: { id: string; title: string }[];
}) {
  const activeId = useActiveSection(sections);

  return (
    <div className="sticky top-0 z-10 mb-8 overflow-x-auto border-b border-gray-100 bg-white/95 py-2 backdrop-blur-sm lg:hidden">
      <ul className="flex w-max gap-2">
        {sections.map((section) => {
          const isActive = section.id === activeId;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`block whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors duration-150 ${
                  isActive
                    ? "border-[var(--brand-primary-light)] font-medium text-[var(--brand-primary-light)]"
                    : "border-gray-200 text-gray-500"
                }`}
              >
                {section.title}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
