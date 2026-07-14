'use client';

import EditAvatarModal from '@/components/profile/EditAvatarModal';
import EditEmailModal from '@/components/profile/EditEmailModal';
import EditPasswordModal from '@/components/profile/EditPasswordModal';
import { useState } from 'react';

type Modal = 'password' | 'email' | 'avatar' | null;

type Props = {
  currentEmail: string;
  currentAvatar: string | null;
  initials: string;
  onVerifyPassword: (password: string) => Promise<string>;
  onUpdatePassword: (verificationId: string, newPassword: string) => Promise<void>;
  onSendEmailCode: (email: string) => Promise<string>;
  onVerifyEmailCode: (email: string, code: string, verificationRecordId: string) => Promise<void>;
  onUpdateEmail: (currentVerifId: string, newVerifId: string) => Promise<void>;
  onUpdateAvatar: (url: string) => Promise<void>;
};

export default function ProfileActions({
  currentEmail,
  currentAvatar,
  initials,
  onVerifyPassword,
  onUpdatePassword,
  onSendEmailCode,
  onVerifyEmailCode,
  onUpdateEmail,
  onUpdateAvatar,
}: Props) {
  const [open, setOpen] = useState<Modal>(null);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <ActionButton label="Change Password" onClick={() => setOpen('password')} />
        <ActionButton label="Change Email" onClick={() => setOpen('email')} />
        <ActionButton label="Update Avatar" onClick={() => setOpen('avatar')} />
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
          currentEmail={currentEmail}
          onSendCode={onSendEmailCode}
          onVerifyCode={onVerifyEmailCode}
          onUpdateEmail={onUpdateEmail}
          onClose={() => setOpen(null)}
        />
      )}

      {open === 'avatar' && (
        <EditAvatarModal
          currentAvatar={currentAvatar}
          initials={initials}
          onUpdateAvatar={onUpdateAvatar}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="default-radius px-3 py-2 text-sm font-semibold cursor-pointer btn-outline-brand transition-opacity"
    >
      {label}
    </button>
  );
}
