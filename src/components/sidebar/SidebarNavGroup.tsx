export default function SidebarNavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 px-2 text-2xs font-medium uppercase text-gray-300 tracking-wider">
        {label}
      </h3>
      <ul>{children}</ul>
    </div>
  );
}
