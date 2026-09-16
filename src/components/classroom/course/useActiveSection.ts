import { useEffect, useState } from "react";

export function useActiveSection(sections: { id: string }[]) {
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

  return activeId;
}
