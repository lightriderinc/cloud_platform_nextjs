import NotAuthorized from "@/app/not-authorized";
import { getSession } from "@/lib/auth/session";

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated } = await getSession();

  if (!isAuthenticated) return <NotAuthorized />;

  return <>{children}</>;
}
