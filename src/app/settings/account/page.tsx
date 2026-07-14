import { logtoConfig } from "@/app/logto";
import LogoutButton from "@/components/auth/LogoutButton";
import {
  getMyProfile,
  sendEmailCode,
  updateBirthdate,
  updateName,
  updatePassword,
  updatePrimaryEmail,
  verifyEmailCode,
  verifyPassword,
} from "@/lib/logto-account";
import {
  getAccessToken,
  getLogtoContext,
  signOut,
} from "@logto/next/server-actions";
import { revalidatePath, refresh } from "next/cache";
import Image from "next/image";
import { redirect } from "next/navigation";
import ProfileActions from "./ProfileActions";

export default async function AccountPage() {
  const { isAuthenticated, claims, userInfo } = await getLogtoContext(
    logtoConfig,
    {
      fetchUserInfo: true,
    },
  );

  if (!isAuthenticated) redirect("/");

  let birthdate: string | null = null;
  let name = userInfo?.name ?? claims?.name ?? null;

  try {
    const token = await getAccessToken(logtoConfig);
    if (token) {
      const extended = await getMyProfile(token);
      birthdate = extended?.profile?.birthdate ?? null;

      if (!name) {
        const given = extended?.profile?.givenName;
        const family = extended?.profile?.familyName;
        if (given || family) {
          const fullName = [given, family].filter(Boolean).join(" ");
          try {
            await updateName(token, fullName);
          } catch {
            // best-effort
          }
          name = fullName;
        }
      }
    }
  } catch {
    // Account API not enabled or token unavailable
  }
  const email = userInfo?.email ?? null;
  const avatarUrl = userInfo?.picture ?? null;

  const initials = name
    ? name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (email?.slice(0, 2).toUpperCase() ?? "?");

  async function doVerifyPassword(password: string): Promise<string> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    return verifyPassword(token, password);
  }

  async function doUpdatePassword(
    verificationId: string,
    newPassword: string,
  ): Promise<void> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    await updatePassword(token, verificationId, newPassword);
  }

  async function doSendEmailCode(emailAddr: string): Promise<string> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    return sendEmailCode(token, emailAddr);
  }

  async function doVerifyEmailCode(
    emailAddr: string,
    code: string,
    verificationRecordId: string,
  ): Promise<void> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    await verifyEmailCode(token, emailAddr, code, verificationRecordId);
  }

  async function doUpdateEmail(
    currentVerifId: string,
    newVerifId: string,
  ): Promise<void> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    await updatePrimaryEmail(token, currentVerifId, newVerifId);
  }

  async function doUpdateBirthdate(birthdate: string): Promise<void> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    await updateBirthdate(token, birthdate);
    revalidatePath("/settings/account");
    refresh();
  }

  async function doSignOut(): Promise<void> {
    "use server";
    await signOut(logtoConfig);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-700 animate-fade-in-up">
        Account
      </h1>
      <p className="mb-12 text-sm text-gray-500">
        Your Light Rider account details.
      </p>

      <div className="flex items-center gap-4 mb-12">
        <div className="relative w-16 h-16 default-radius overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center flex-shrink-0">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Avatar"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="text-xl font-semibold text-gray-500">
              {initials}
            </span>
          )}
        </div>
        <div className="min-w-0">
          {name && (
            <p className="text-3xl font-semibold text-gray-800 truncate">
              {name}
            </p>
          )}
          <span className="text-sm text-gray-500">{email}</span>
        </div>
      </div>

      <ProfileActions
        name={name}
        email={email ?? ""}
        birthdate={birthdate}
        onVerifyPassword={doVerifyPassword}
        onUpdatePassword={doUpdatePassword}
        onSendEmailCode={doSendEmailCode}
        onVerifyEmailCode={doVerifyEmailCode}
        onUpdateEmail={doUpdateEmail}
        onUpdateBirthdate={doUpdateBirthdate}
      />

      <div className="mt-8 pt-8">
        <LogoutButton onSignOut={doSignOut} />
      </div>
    </div>
  );
}
