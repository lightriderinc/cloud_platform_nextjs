import { logtoConfig } from "@/app/logto";
import LogoutButton from "@/components/auth/LogoutButton";
import CurrentPlanBadge from "@/components/billing/CurrentPlanBadge";
import ConnectedAccounts from "@/components/profile/ConnectedAccounts";
import ProfileAvatar from "@/components/profile/ProfileAvatar";
import { AVATAR_FORM_FIELD, getAvatarDataUri } from "@/lib/avatar";
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
  normalizeSocialIdentities,
  sendEmailCode,
  updateAvatar,
  updateBirthdate,
  updatePassword,
  updatePrimaryEmail,
  verifyEmailCode,
  verifyPassword,
} from "@/lib/logto-account";
import { uploadAvatar } from "@/lib/supabase/avatars";
import {
  findUserByPrimaryEmail,
  getUserAccountFacts,
  type LogtoUserSummary,
} from "@/lib/logto/management";
import { getAccessToken, signOut } from "@logto/next/server-actions";
import { refresh, revalidatePath } from "next/cache";
import ProfileActions from "./ProfileActions";

export default async function AccountPage() {
  const { userInfo, claims } = await getSession();

  // Resolve the display name via the shared resolver so a brand-new user's full
  // name shows on first sign-in (session claims lag until the first refresh; the
  // Account API reflects it immediately). getAccountProfile is cached, so this
  // and getDisplayName share a single Account API fetch per request.
  const name = await getDisplayName();
  const account = await getAccountProfile();
  const birthdate = account?.profile?.birthdate ?? null;

  // Linked socials + password status.
  //
  // The end-user Account API (`/api/my-account`) only returns `identities` /
  // `hasPassword` when the Logto Account Center `fields` config exposes them,
  // so relying on it leaves social users with an empty "Connected accounts"
  // section. The Management API (`GET /api/users/{id}`) returns both fields
  // unconditionally, so we use it as the primary source and fall back to the
  // Account API values only if the M2M lookup fails.
  //
  // hasPassword defaults to true on total failure, preserving the existing
  // change-password behavior for password users on a transient error.
  const sub = claims?.sub ?? userInfo?.sub ?? null;
  let hasPassword = account?.hasPassword ?? true;
  let socialIdentities = normalizeSocialIdentities(account?.identities);

  if (sub) {
    try {
      const facts = await getUserAccountFacts(sub);
      socialIdentities = normalizeSocialIdentities(facts.identities);
      if (facts.hasPassword !== null) {
        hasPassword = facts.hasPassword;
      }
    } catch (err) {
      console.error(
        "[account] failed to load identities/password via Management API; using Account API fallback:",
        err,
      );
    }
  }

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
  // Shared resolver — the header's UserCard uses the same one, so the two
  // can't disagree about which picture (or which generated fallback) is current.
  const { src: customAvatarUrl, fallbackSrc: generatedAvatarUrl } =
    resolveAvatarSources({
      picture: userInfo?.picture,
      name,
      email,
    });

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

  /**
   * Saves a directly-pasted image URL onto the Logto user record. This is the
   * "Image URL" tab of the avatar modal, and it's also the second half of the
   * upload flow — once a cropped file lands in storage, its public URL gets
   * written here the same way.
   */
  async function doUpdateAvatarUrl(avatarUrl: string): Promise<void> {
    "use server";
    const token = await getAccessToken(logtoConfig);
    await updateAvatar(token, avatarUrl);
    // "layout" scope, not the usual "/settings/account": the avatar also
    // renders in the header UserCard, which lives in the root layout.
    // Revalidating just this page leaves the header showing the old picture
    // until a full reload.
    revalidatePath("/", "layout");
    refresh();
  }

  /**
   * Uploads the cropped avatar to Supabase Storage, then writes the
   * resulting public URL onto the Logto user the same way the "Image URL"
   * tab does. requireLogtoUser()'s own error ("UNAUTHENTICATED") isn't
   * user-facing, so it's caught and rethrown with a friendlier message here
   * rather than changed at the shared helper.
   */
  async function doUploadAvatar(formData: FormData): Promise<string> {
    "use server";
    let sub: string;
    try {
      ({ sub } = await requireLogtoUser());
    } catch {
      throw new Error("You must be signed in to upload an avatar.");
    }

    const file = formData.get(AVATAR_FORM_FIELD);
    if (!(file instanceof File)) {
      throw new Error("No image was received. Try again.");
    }

    const url = await uploadAvatar(sub, file);
    await doUpdateAvatarUrl(url); // writes to Logto + revalidates
    return url;
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
        <ProfileAvatar
          src={customAvatarUrl}
          fallbackSrc={generatedAvatarUrl}
          name={name || email || "Your account"}
          size={64}
          onUpdateAvatarUrl={doUpdateAvatarUrl}
          onUploadAvatar={doUploadAvatar}
        />
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
        hasPassword={hasPassword}
        connectedAccounts={<ConnectedAccounts identities={socialIdentities} />}
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

      <div className="mt-6">
        <LogoutButton onSignOut={doSignOut} />
      </div>
    </div>
  );
}
