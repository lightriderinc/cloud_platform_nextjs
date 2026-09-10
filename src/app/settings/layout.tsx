import SignInRequired from "@/components/auth/SignInRequired";
import { getSession } from "@/lib/auth/session";

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated } = await getSession();

  // Signed out is not the same as forbidden. Showing the 401 "Access denied"
  // screen here was alarming for the ordinary case of a session that ended
  // (often on another Light Rider platform) while the user was mid-task.
  if (!isAuthenticated) {
    return <SignInRequired target="your account settings" />;
  }

  return <>{children}</>;
}
