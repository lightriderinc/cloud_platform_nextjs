"use client";

import { usePathname } from "next/navigation";

const SECONDARY_SIDEBAR_ROUTES = ["/settings", "/legal"];

export default function SidebarSecondaryGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const showSecondarySidebar = SECONDARY_SIDEBAR_ROUTES.some((route) =>
    pathname?.startsWith(route),
  );

  if (!showSecondarySidebar) return null;

  return <>{children}</>;
}
