'use client';

import EditEmailModal from '@/components/profile/EditEmailModal';
import EditPasswordModal from '@/components/profile/EditPasswordModal';
import { useState } from 'react';
import { MdEditSquare } from 'react-icons/md';

type Modal = 'password' | 'email' | 'birthdate' | null;

type Props = {
  name: string | null;
  email: string;
  birthdate: string | null;
  onVerifyPassword: (password: string) => Promise<string>;
  onUpdatePassword: (verificationId: string, newPassword: string) => Promise<void>;
  onSendEmailCode: (email: string) => Promise<string>;
  onVerifyEmailCode: (email: string, code: string, verificationRecordId: string) => Promise<string>;
  onUpdateEmail: (currentVerifId: string, newVerifId: string, email: string) => Promise<void>;
  onUpdateBirthdate: (birthdate: string) => Promise<void>;
};

export default function ProfileActions({
  name,
  email,
  birthdate,
  onVerifyPassword,
  onUpdatePassword,
  onSendEmailCode,
  onVerifyEmailCode,
  onUpdateEmail,
  onUpdateBirthdate,
}: Props) {
  const [open, setOpen] = useState<Modal>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [currentBirthdate, setCurrentBirthdate] = useState(birthdate);

  const formattedBirthdate = currentBirthdate
    ? new Date(currentBirthdate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <>
      <div className="flex flex-col mb-5">
        <div className="flex w-full border-b border-color-brand mb-5">
          <h2 className="mb-2 text-xl font-bold text-gray-500">Profile</h2>
        </div>
        <div className="flex flex-col default-radius divide-y border-b border-gray-200 divide-gray-200 mb-8 max-w-3xl">
          <InfoRow label="Full Name" value={name ?? '—'} />
          <div className="flex flex-row justify-between items-center">
            <InfoRow label="Email" value={email} />
            <InlineEditButton label="Change Email" onClick={() => setOpen('email')} />
          </div>
          <div className="flex flex-row justify-between items-center">
            <InfoRow label="Birthdate" value={formattedBirthdate ?? '—'} />
            {!currentBirthdate && (
              <InlineEditButton label="Add Birthdate" onClick={() => setOpen('birthdate')} />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col mb-5">
        <div className="flex w-full border-b border-color-brand mb-5">
          <h2 className="mb-2 text-xl font-bold text-gray-500">Security</h2>
        </div>
        <div className="flex flex-col default-radius divide-y border-b border-gray-200 divide-gray-200 mb-8 max-w-3xl">
          <div className="flex flex-row justify-between items-center">
            <InfoRow label="Password" value="••••••••" />
            <InlineEditButton label="Change Password" onClick={() => setOpen('password')} />
          </div>
          <div className="flex flex-row justify-between items-center py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-gray-700">Two-Factor Auth</span>
              <span className="text-sm text-gray-400">{mfaEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            <MfaToggle enabled={mfaEnabled} onToggle={setMfaEnabled} />
          </div>
        </div>
      </div>

      {open === 'password' && (
        <EditPasswordModal
          onVerifyPassword={onVerifyPassword}
          onUpdatePassword={onUpdatePassword}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'email' && (
        <EditEmailModal
          currentEmail={email}
          onVerifyPassword={onVerifyPassword}
          onSendCode={onSendEmailCode}
          onVerifyCode={onVerifyEmailCode}
          onUpdateEmail={onUpdateEmail}
          onClose={() => setOpen(null)}
        />
      )}
      {open === 'birthdate' && (
        <AddBirthdateModal
          onSave={async (date) => {
            await onUpdateBirthdate(date);
            setCurrentBirthdate(date);
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center py-3 gap-6 min-w-0">
      <dt className="text-sm font-bold text-gray-700 flex-shrink-0 w-24">{label}</dt>
      <dd className="text-base text-gray-400 truncate flex-1">{value}</dd>
    </div>
  );
}

function InlineEditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-row gap-2 items-center default-radius cursor-pointer border border-gray-200 pl-3 pr-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 flex-shrink-0 ml-4"
    >
      <MdEditSquare />
      {label}
    </button>
  );
}

function AddBirthdateModal({
  onSave,
  onClose,
}: {
  onSave: (date: string) => Promise<void>;
  onClose: () => void;
}) {
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!date) return;
    setError('');
    setLoading(true);
    try {
      await onSave(date);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save birthdate');
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md bg-white default-radius border border-gray-200 p-6 shadow-lg animate-scale-in mx-4">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Add Birthdate</h2>
        <label className="block text-xs text-gray-500 mb-1">Date of birth</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          autoFocus
          className="w-full default-radius border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-4"
        />
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button
          onClick={handleSave}
          disabled={loading || !date}
          className="w-full default-radius px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 cursor-pointer transition-opacity"
          style={{ backgroundColor: loading || !date ? '#aaa' : 'var(--brand-primary)' }}
        >
          {loading ? 'Saving…' : 'Save Birthdate'}
        </button>
      </div>
    </div>
  );
}

function MfaToggle({ enabled, onToggle }: { enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onToggle(!enabled)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ml-4 ${
        enabled ? 'bg-[var(--brand-primary)]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
