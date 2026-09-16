"use client";

import { useEffect, useState } from "react";

export default function CourseTableOfContents({
  sections,
}: {
  sections: { id: string; title: string }[];
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id);

  useEffect(() => {
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((heading): heading is HTMLElement => heading !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="sticky top-24 self-start">
      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        On this page
      </span>
      <ul className="flex flex-col border-l border-gray-200">
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
