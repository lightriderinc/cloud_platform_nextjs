'use client';

import { useState } from 'react';

import VerifyIdentity from '@/components/profile/VerifyIdentity';
import LRButton from '@/components/ui/LRButton';
import PasswordRequirements, { meetsLivePasswordRequirements } from '@/components/ui/PasswordRequirements';

type Props = {
  /**
   * `change` (default): the user has a password and must confirm the current
   * one before choosing a new one. `set`: the user has no password yet
   * (social/SSO-only) so there is nothing to confirm with — identity is proven
   * with an emailed code instead.
   */
  mode?: 'change' | 'set';
  onVerifyPassword: (password: string) => Promise<string>;
  onUpdatePassword: (verificationId: string, newPassword: string) => Promise<void>;
  onClose: () => void;
  /**
   * Called once the password has been successfully set/changed. Used by the
   * account page to refresh server data so a first-time "Set password" flips
   * the UI to "Change password" without a manual reload.
   */
  onSuccess?: () => void;
  /** Current email, required in `set` mode for the email-code verification. */
  email?: string;
  /** Required in `set` mode: send a one-time code to the user's email. */
  onSendEmailCode?: (email: string) => Promise<string>;
  /** Required in `set` mode: verify the emailed code. */
  onVerifyEmailCode?: (
    email: string,
    code: string,
    verificationRecordId: string,
  ) => Promise<string>;
};

type Step = 'verify' | 'set' | 'done';

export default function EditPasswordModal({
  mode = 'change',
  onVerifyPassword,
  onUpdatePassword,
  onClose,
  onSuccess,
  email = '',
  onSendEmailCode,
  onVerifyEmailCode,
}: Props) {
  const isSet = mode === 'set';
  const [step, setStep] = useState<Step>('verify');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const title = isSet ? 'Set Password' : 'Change Password';

  async function handleVerify() {
    setError('');
    setLoading(true);
    try {
      const id = await onVerifyPassword(currentPwd);
      setVerificationId(id);
      setStep('set');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Incorrect password');
    } finally {
      setLoading(false);
    }
  }

  // In `set` mode identity is confirmed via VerifyIdentity (email code), which
  // hands back a verification record id we reuse to authorize setting the
  // password.
  function handleIdentityVerified(id: string) {
    setVerificationId(id);
    setError('');
    setStep('set');
  }

  async function handleUpdate() {
    if (newPwd !== confirmPwd) { setError('Passwords do not match'); return; }
    if (!meetsLivePasswordRequirements(newPwd)) { setError('Please meet the password requirements below.'); return; }
    setError('');
    setLoading(true);
    try {
      await onUpdatePassword(verificationId, newPwd);
      setStep('done');
      onSuccess?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${isSet ? 'set' : 'update'} password`);
    } finally {
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

        <h2 className="text-lg font-semibold text-gray-800 mb-1">{title}</h2>

        {step === 'verify' && isSet && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              You signed up with a linked account, so there is no current password to confirm.
              Verify it is you with an email code to set one.
            </p>
            <VerifyIdentity
              email={email}
              allowPassword={false}
              onVerifyPassword={onVerifyPassword}
              onSendEmailCode={onSendEmailCode ?? (async () => '')}
              onVerifyEmailCode={onVerifyEmailCode ?? (async () => '')}
              onVerified={handleIdentityVerified}
              submitLabel="Continue"
            />
          </>
        )}

        {step === 'verify' && !isSet && (
          <>
            <p className="text-sm text-gray-500 mb-4">Confirm your current password to continue.</p>
            <label className="block text-xs text-gray-500 mb-1">Current password</label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              autoFocus
              className="w-full default-radius border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-4"
            />
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <LRButton
              variant="primary"
              onClick={handleVerify}
              disabled={loading || !currentPwd}
              className="w-full"
            >
              {loading ? 'Verifying…' : 'Continue'}
            </LRButton>
          </>
        )}

        {step === 'set' && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {isSet ? 'Choose a password.' : 'Choose a new password.'}
            </p>
            <label className="block text-xs text-gray-500 mb-1">
              {isSet ? 'Password' : 'New password'}
            </label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              autoFocus
              className="w-full default-radius border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-3"
            />
            <PasswordRequirements password={newPwd} className="mb-4" />
            <label className="block text-xs text-gray-500 mb-1">
              {isSet ? 'Confirm password' : 'Confirm new password'}
            </label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
              className="w-full default-radius border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-4"
            />
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <LRButton
              variant="primary"
              onClick={handleUpdate}
              disabled={loading || !newPwd || !confirmPwd}
              className="w-full"
            >
              {loading
                ? isSet
                  ? 'Setting…'
                  : 'Updating…'
                : isSet
                  ? 'Set Password'
                  : 'Update Password'}
            </LRButton>
          </>
        )}

        {step === 'done' && (
          <div className="pt-2 text-center">
            <p className="text-sm text-gray-700 mb-4">
              {isSet
                ? 'Your password has been set. You can now sign in with your email and password.'
                : 'Your password has been updated.'}
            </p>
            <LRButton variant="secondary" onClick={onClose}>
              Done
            </LRButton>
          </div>
        )}
      </div>
    </div>
  );
}
