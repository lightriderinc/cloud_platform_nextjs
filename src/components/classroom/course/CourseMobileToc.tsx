"use client";

import { useState } from "react";
import { MdArrowForwardIos } from "react-icons/md";
import { useActiveSection } from "./useActiveSection";

export default function CourseMobileToc({
  sections,
}: {
  sections: { id: string; title: string }[];
}) {
  const activeId = useActiveSection(sections);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="sticky -top-6 z-10 mb-8 border-b border-gray-100 bg-white/90 backdrop-blur-sm lg:hidden -mx-4 w-[100vw]">
      <div className="flex w-full items-center py-3 px-4">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex gap-1.5 text-sm font-medium text-gray-500 inline-flex items-center hover:text-[var(--brand-primary)] cursor-pointer"
      >
        On this page
        <MdArrowForwardIos
          className={`transition-transform duration-150 ${
            isOpen ? "rotate-90" : ""
          }`}
          size={12}
        />
      </button>
        </div>


      {isOpen && (
        <ul className="flex flex-col gap-1 pb-3 px-3">
          {sections.map((section) => {
            const isActive = section.id === activeId;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={() => setIsOpen(false)}
                  className={`block rounded px-2 py-1.5 text-sm transition-colors duration-150 ${
                    isActive
                      ? "font-medium text-[var(--brand-primary-light)]"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {section.title}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
