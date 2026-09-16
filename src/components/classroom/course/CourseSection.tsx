import { ReactNode } from "react";

export default function CourseSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <h2 className="text-2xl font-semibold text-gray-800 mb-4">{title}</h2>
      <div className="flex flex-col gap-4 text-gray-700 leading-relaxed">
        {children}
      </div>
    </section>
  );
}
