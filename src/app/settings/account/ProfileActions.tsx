"use client";

import DisableMfaModal from "@/components/profile/DisableMfaModal";
import EditEmailModal from "@/components/profile/EditEmailModal";
import EditPasswordModal from "@/components/profile/EditPasswordModal";
import SetupMfaModal from "@/components/profile/SetupMfaModal";
import LRButton from "@/components/ui/LRButton";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MdEditSquare } from "react-icons/md";

type Modal = "password" | "email" | "birthdate" | "mfa-setup" | "mfa-disable" | null;

type Props = {
  name: string | null;
  email: string;
  birthdate: string | null;
  mfaEnabled: boolean;
  /** Whether the user already has a password set (false for social/SSO-only). */
  hasPassword: boolean;
  /**
   * Slot rendered between the Profile and Security sections — used for the
   * server-rendered "Connected accounts" list, which a client component can't
   * render itself.
   */
  connectedAccounts?: React.ReactNode;
  onVerifyPassword: (password: string) => Promise<string>;
  onUpdatePassword: (
    verificationId: string,
    newPassword: string,
  ) => Promise<void>;
  onSendEmailCode: (email: string) => Promise<string>;
  onVerifyEmailCode: (
    email: string,
    code: string,
    verificationRecordId: string,
  ) => Promise<string>;
  onCheckEmailAvailable: (email: string) => Promise<void>;
  onUpdateEmail: (
    currentVerifId: string,
    newVerifId: string,
    email: string,
  ) => Promise<void>;
  onUpdateBirthdate: (birthdate: string) => Promise<void>;
  onGenerateTotpSecret: () => Promise<string>;
  onBindTotp: (
    verificationRecordId: string,
    secret: string,
    code: string,
  ) => Promise<void>;
  onDisableMfa: (verificationRecordId: string) => Promise<void>;
};

export default function ProfileActions({
  name,
  email,
  birthdate,
  mfaEnabled: initialMfaEnabled,
  hasPassword,
  connectedAccounts,
  onVerifyPassword,
  onUpdatePassword,
  onSendEmailCode,
  onVerifyEmailCode,
  onCheckEmailAvailable,
  onUpdateEmail,
  onUpdateBirthdate,
  onGenerateTotpSecret,
  onBindTotp,
  onDisableMfa,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<Modal>(null);
  const [mfaEnabled, setMfaEnabled] = useState(initialMfaEnabled);
  const [currentBirthdate, setCurrentBirthdate] = useState(birthdate);

  // currentBirthdate is a plain "YYYY-MM-DD" string (from <input type="date">
  // and Logto's OIDC birthdate claim) with no time/timezone component.
  // new Date("YYYY-MM-DD") parses that as UTC midnight, so formatting it in
  // the browser's local timezone could shift the displayed day backward for
  // anyone behind UTC. Building the Date from numeric y/m/d args instead
  // always constructs local midnight, which toLocaleDateString can't shift
  // across a day boundary.
  const formattedBirthdate = currentBirthdate
    ? (() => {
        const [y, m, d] = currentBirthdate.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      })()
    : null;

  return (
    <>
      <div className="flex flex-col mb-5">
        <div className="flex w-full mb-5">
          <h2 className="text-xl font-bold text-gray-500">Profile</h2>
        </div>
        <div className="flex flex-col default-radius divide-y divide-gray-100 mb-8 max-w-3xl bg-gray-50 px-4 py-1">
          <InfoRow label="Full Name" value={name ?? "—"} />

          <div className="flex flex-row justify-between items-center">
            <InfoRow label="Birthdate" value={formattedBirthdate ?? "—"} />
            {!currentBirthdate && (
              <InlineEditButton
                label="Add Birthdate"
                onClick={() => setOpen("birthdate")}
              />
            )}
          </div>
          <div className="flex flex-row justify-between items-center">
            <InfoRow label="Email" value={email} />
            <InlineEditButton
              label="Change Email"
              onClick={() => setOpen("email")}
            />
          </div>
        </div>
      </div>

      {connectedAccounts}

      <div className="flex flex-col mb-5">
        <div className="flex w-full mb-5">
          <h2 className="text-xl font-bold text-gray-500">Security</h2>
        </div>
        <div className="flex flex-col default-radius divide-y divide-gray-100 mb-8 max-w-3xl bg-gray-50 px-4 py-1">
          <div className="flex flex-row justify-between items-center">
            <InfoRow label="Password" value={hasPassword ? "••••••••" : "Not set"} />
            <InlineEditButton
              label={hasPassword ? "Change Password" : "Set Password"}
              onClick={() => setOpen("password")}
            />
          </div>
          <div className="flex flex-row justify-between items-center py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-gray-700">
                Two-Factor Auth
              </span>
              <span className="text-sm text-gray-400">
                {mfaEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <MfaToggle
              enabled={mfaEnabled}
              onToggle={(next) => setOpen(next ? "mfa-setup" : "mfa-disable")}
            />
          </div>
        </div>
      </div>

      {open === "password" && (
        <EditPasswordModal
          mode={hasPassword ? "change" : "set"}
          email={email}
          onVerifyPassword={onVerifyPassword}
          onUpdatePassword={onUpdatePassword}
          onSendEmailCode={onSendEmailCode}
          onVerifyEmailCode={onVerifyEmailCode}
          onSuccess={() => router.refresh()}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "email" && (
        <EditEmailModal
          currentEmail={email}
          onVerifyPassword={onVerifyPassword}
          onSendCode={onSendEmailCode}
          onVerifyCode={onVerifyEmailCode}
          onCheckEmailAvailable={onCheckEmailAvailable}
          onUpdateEmail={onUpdateEmail}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "birthdate" && (
        <AddBirthdateModal
          onSave={async (date) => {
            await onUpdateBirthdate(date);
            setCurrentBirthdate(date);
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "mfa-setup" && (
        <SetupMfaModal
          email={email}
          issuer="Light Rider"
          onVerifyPassword={onVerifyPassword}
          onSendEmailCode={onSendEmailCode}
          onVerifyEmailCode={onVerifyEmailCode}
          onGenerateSecret={onGenerateTotpSecret}
          onBind={onBindTotp}
          onSuccess={() => setMfaEnabled(true)}
          onClose={() => setOpen(null)}
        />
      )}
      {open === "mfa-disable" && (
        <DisableMfaModal
          email={email}
          onVerifyPassword={onVerifyPassword}
          onSendEmailCode={onSendEmailCode}
          onVerifyEmailCode={onVerifyEmailCode}
          onDisable={onDisableMfa}
          onSuccess={() => setMfaEnabled(false)}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center py-3 gap-6 min-w-0">
      <dt className="text-sm font-bold text-gray-700 flex-shrink-0 w-24">
        {label}
      </dt>
      <dd className="text-base text-gray-400 truncate flex-1">{value}</dd>
    </div>
  );
}

function InlineEditButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <LRButton
      onClick={onClick}
      variant="secondary-outline"
      icon={<MdEditSquare />}
      className="flex-shrink-0 ml-4"
    >
      {label}
    </LRButton>
  );
}

function AddBirthdateModal({
  onSave,
  onClose,
}: {
  onSave: (date: string) => Promise<void>;
  onClose: () => void;
}) {
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!date) return;
    setError("");
    setLoading(true);
    try {
      await onSave(date);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save birthdate");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md bg-white default-radius border border-gray-100 p-6 shadow-lg animate-scale-in mx-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Add Birthdate
        </h2>
        <label className="block text-xs text-gray-500 mb-1">
          Date of birth
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          autoFocus
          className="w-full default-radius border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-4"
        />
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <LRButton
          onClick={handleSave}
          disabled={loading || !date}
          variant="primary"
          className="w-full"
        >
          {loading ? "Saving…" : "Save Birthdate"}
        </LRButton>
      </div>
    </div>
  );
}

function MfaToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onToggle(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ml-4 ${
        enabled ? "bg-[var(--brand-primary)]" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
