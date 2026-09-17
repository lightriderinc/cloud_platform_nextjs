import SignInRequired from "@/components/auth/SignInRequired";
import { getSessionOutcome } from "@/lib/auth/session";

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isAuthenticated, indeterminate } = await getSessionOutcome();

  // Signed out is not the same as forbidden. Showing the 401 "Access denied"
  // screen here was alarming for the ordinary case of a session that ended
  // (often on another Light Rider platform) while the user was mid-task.
  //
  // And "couldn't reach Logto" is not the same as signed out. Swapping
  // `children` for this screen UNMOUNTS everything below it, so a single
  // failed userinfo call during a router.refresh() silently erased whatever
  // the user had typed into a form on this page. Only a KNOWN sign-out is
  // allowed to tear the subtree down; an indeterminate answer keeps rendering
  // what is already there and lets the next check settle it.
  //
  // This is safe because nothing here is an authorization boundary: every
  // /api route re-checks the session itself via requireLogtoUser(), which
  // still fails closed.
  if (!isAuthenticated && !indeterminate) {
    return <SignInRequired target="your account settings" />;
  }

  return <>{children}</>;
}
