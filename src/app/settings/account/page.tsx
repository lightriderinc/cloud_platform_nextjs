import { logtoConfig } from "@/app/logto";
import LogoutButton from "@/components/auth/LogoutButton";
import CurrentPlanBadge from "@/components/billing/CurrentPlanBadge";
import {
  getAccountProfile,
  getDisplayName,
  getSession,
  requireLogtoUser,
} from "@/lib/auth/session";
import {
  bindTotp,
  deleteMfaVerification,
  generateTotpSecret,
  getMfaVerifications,
  sendEmailCode,
  updateBirthdate,
  updatePassword,
  updatePrimaryEmail,
  verifyEmailCode,
  verifyPassword,
} from "@/lib/logto-account";
import { findUserByPrimaryEmail, type LogtoUserSummary } from "@/lib/logto/management";
import { getAccessToken, signOut } from "@logto/next/server-actions";
import { refresh, revalidatePath } from "next/cache";
import Image from "next/image";
import ProfileActions from "./ProfileActions";

export default async function AccountPage() {
  const { userInfo } = await getSession();

  // Resolve the display name via the shared resolver so a brand-new user's full
  // name shows on first sign-in (session claims lag until the first refresh; the
  // Account API reflects it immediately). getAccountProfile is cached, so this
  // and getDisplayName share a single Account API fetch per request.
  const name = await getDisplayName();
  const account = await getAccountProfile();
  const birthdate = account?.profile?.birthdate ?? null;

  let mfaEnabled = false;
  try {
    const token = await getAccessToken(logtoConfig);
    if (token) {
      const mfaFactors = await getMfaVerifications(token);
      mfaEnabled = mfaFactors.some((factor) => factor.type === "Totp");
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

  /**
   * Pre-flight duplicate-email check for the change-email flow. Runs BEFORE any
   * verification code is sent, so the user is warned up front instead of only
   * after verifying an address they can't actually use (bug EM-02).
   *
   * Throws a user-facing message on conflict; the modal surfaces it inline and
   * stays on the "enter new email" step. Fails open on lookup errors — the
   * Account API still enforces uniqueness when the change is finalized, so an
   * infra hiccup in this pre-check never blocks a legitimate change.
   *
   * Note: confirming whether an email is registered is account enumeration.
   * This matches the platform's existing sign-up behavior, and can be masked
   * later via Logto's "Hide account existence" setting if desired.
   */
  async function doCheckEmailAvailability(emailAddr: string): Promise<void> {
    "use server";
    const candidate = emailAddr.trim();
    const { sub } = await requireLogtoUser();

    let existing: LogtoUserSummary | null = null;
    try {
      existing = await findUserByPrimaryEmail(candidate);
    } catch (err) {
      console.error(
        "[account] email availability pre-check failed; allowing flow to continue:",
        err,
      );
      return;
    }

    if (!existing) {
      return; // available
    }
    if (existing.id === sub) {
      throw new Error("That's already the email address on your account.");
    }
    throw new Error("That email is already linked to another account.");
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
  ): Promise<string> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    return verifyEmailCode(token, emailAddr, code, verificationRecordId);
  }

  async function doUpdateEmail(
    currentVerifId: string,
    newVerifId: string,
    emailAddr: string,
  ): Promise<void> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    await updatePrimaryEmail(token, currentVerifId, newVerifId, emailAddr);
  }

  async function doUpdateBirthdate(birthdate: string): Promise<void> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    await updateBirthdate(token, birthdate);
    revalidatePath("/settings/account");
    refresh();
  }

  async function doGenerateTotpSecret(): Promise<string> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    return generateTotpSecret(token);
  }

  async function doBindTotp(
    verificationRecordId: string,
    secret: string,
    code: string,
  ): Promise<void> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    await bindTotp(token, verificationRecordId, secret, code);
    revalidatePath("/settings/account");
  }

  async function doDisableMfa(verificationRecordId: string): Promise<void> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    const factors = await getMfaVerifications(token);
    for (const factor of factors) {
      await deleteMfaVerification(token, verificationRecordId, factor.id);
    }
    revalidatePath("/settings/account");
  }

  async function doSignOut(): Promise<void> {
    "use server";
    await signOut(logtoConfig);
  }

  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-semibold text-gray-700">
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
          <CurrentPlanBadge />
        </div>
      </div>

      <ProfileActions
        name={name}
        email={email ?? ""}
        birthdate={birthdate}
        mfaEnabled={mfaEnabled}
        onVerifyPassword={doVerifyPassword}
        onUpdatePassword={doUpdatePassword}
        onSendEmailCode={doSendEmailCode}
        onVerifyEmailCode={doVerifyEmailCode}
        onCheckEmailAvailable={doCheckEmailAvailability}
        onUpdateEmail={doUpdateEmail}
        onUpdateBirthdate={doUpdateBirthdate}
        onGenerateTotpSecret={doGenerateTotpSecret}
        onBindTotp={doBindTotp}
        onDisableMfa={doDisableMfa}
      />

      <div className="mt-8 pt-8">
        <LogoutButton onSignOut={doSignOut} />
      </div>
    </div>
  );
}
