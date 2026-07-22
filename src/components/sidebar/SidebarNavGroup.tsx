export default function SidebarNavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-gray-300">
        {label}
      </h3>
      <ul>{children}</ul>
    </div>
  );
}
