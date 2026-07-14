import { logtoConfig } from "@/app/logto";
import LogoutButton from "@/components/auth/LogoutButton";
import {
  getMyProfile,
  sendEmailCode,
  updateAvatar,
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
import Image from "next/image";
import { redirect } from "next/navigation";
import { MdEditSquare } from "react-icons/md";

export default async function AccountPage() {
  const { isAuthenticated, claims, userInfo } = await getLogtoContext(
    logtoConfig,
    {
      fetchUserInfo: true,
    },
  );

  if (!isAuthenticated) redirect("/");

  // Attempt to load extended profile (birthdate). Account API must be enabled in Logto console.
  let birthdate: string | null = null;
  try {
    const token = await getAccessToken(logtoConfig);
    if (token) {
      const extended = await getMyProfile(token);
      birthdate = extended?.birthdate ?? null;
    }
  } catch {
    // Account API not enabled or token unavailable — extended profile won't show
  }

  const name = userInfo?.name ?? claims?.name ?? null;
  const email = userInfo?.email ?? null;
  const userId = claims?.sub ?? "";
  const avatarUrl = userInfo?.picture ?? null;

  const initials = name
    ? name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (email?.slice(0, 2).toUpperCase() ?? "?");

  // Server actions — each fetches a fresh access token so they work after token expiry

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

  async function doSendEmailCode(email: string): Promise<string> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    return sendEmailCode(token, email);
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

  async function doUpdateAvatar(avatarUrlInput: string): Promise<void> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    await updateAvatar(token, avatarUrlInput);
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

      <div className="flex flex-col mb-5">
        <div className="flex w-full border-b border-color-brand mb-5">
          <h2 className="mb-2 text-xl font-bold text-gray-500">Profile</h2>
        </div>

        {/* Info rows */}
        <div className="flex flex-col gap-5 default-radius divide-y border-b border-gray-200 divide-gray-200 mb-8 max-w-3xl">
          <InfoRow label="Full Name" value={name ?? "—"} />
          <div className="flex flex-row justify-between items-center">
            <InfoRow
              label="Birthdate"
              value={
                birthdate
                  ? new Date(birthdate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"
              }
            />
            <button className="flex flex-row gap-2 items-center default-radius cursor-pointer border border-gray-200 pl-3 pr-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <MdEditSquare />
              Add Birthdate
            </button>
          </div>

          <div className="flex flex-row justify-between items-center">
            <InfoRow label="Email" value={email ?? "—"} />
            <button className="flex flex-row gap-2 items-center default-radius cursor-pointer border border-gray-200 pl-3 pr-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <MdEditSquare />
              Change Email
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col mb-5">
        <div className="flex w-full border-b border-color-brand mb-5">
          <h2 className="mb-2 text-xl font-bold text-gray-500">Security</h2>
        </div>
        <div className="flex flex-col gap-5 default-radius divide-y border-b border-gray-200 divide-gray-200 mb-8 max-w-3xl">
          <div className="flex flex-row justify-between items-center">
            <InfoRow label="Password" value="••••••••" />
            <button className="flex flex-row gap-2 items-center default-radius cursor-pointer border border-gray-200 pl-3 pr-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <MdEditSquare />
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Edit actions (client component) */}
      {/* <ProfileActions
        currentEmail={email ?? ""}
        currentAvatar={avatarUrl}
        initials={initials}
        onVerifyPassword={doVerifyPassword}
        onUpdatePassword={doUpdatePassword}
        onSendEmailCode={doSendEmailCode}
        onVerifyEmailCode={doVerifyEmailCode}
        onUpdateEmail={doUpdateEmail}
        onUpdateAvatar={doUpdateAvatar}
      /> */}

      <div className="mt-8 pt-8">
        <LogoutButton onSignOut={doSignOut} />
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 gap-6">
      <dt className="text-sm font-bold text-gray-700 flex-shrink-0 w-24">
        {label}
      </dt>
      <dd
        className={`text-base text-gray-400 truncate flex-1 ${mono ? "font-mono text-xs text-gray-500" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function EditButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="default-radius cursor-pointer border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
    >
      <MdEditSquare />
      {label}
    </button>
  );
}
