import { ReactNode } from "react";

export default function ChalkboardPanel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded bg-emerald-900 p-6 shadow-lg chalkboard-bg ${className}`}
    >
      {title && (
        <h3 className="text-2xl handwritten text-white mb-6">{title}</h3>
      )}
      {children}
    </div>
  );
}
