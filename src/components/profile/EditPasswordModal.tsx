'use client';

import { useState } from 'react';

type Props = {
  onVerifyPassword: (password: string) => Promise<string>;
  onUpdatePassword: (verificationId: string, newPassword: string) => Promise<void>;
  onClose: () => void;
};

type Step = 'verify' | 'set' | 'done';

export default function EditPasswordModal({ onVerifyPassword, onUpdatePassword, onClose }: Props) {
  const [step, setStep] = useState<Step>('verify');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  async function handleUpdate() {
    if (newPwd !== confirmPwd) { setError('Passwords do not match'); return; }
    if (newPwd.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    setLoading(true);
    try {
      await onUpdatePassword(verificationId, newPwd);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update password');
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

        <h2 className="text-lg font-semibold text-gray-800 mb-1">Change Password</h2>

        {step === 'verify' && (
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
            <button
              onClick={handleVerify}
              disabled={loading || !currentPwd}
              className="w-full default-radius px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 cursor-pointer transition-opacity"
              style={{ backgroundColor: loading || !currentPwd ? '#aaa' : 'var(--brand-primary)' }}
            >
              {loading ? 'Verifying…' : 'Continue'}
            </button>
          </>
        )}

        {step === 'set' && (
          <>
            <p className="text-sm text-gray-500 mb-4">Choose a new password.</p>
            <label className="block text-xs text-gray-500 mb-1">New password</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              autoFocus
              className="w-full default-radius border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-3"
            />
            <label className="block text-xs text-gray-500 mb-1">Confirm new password</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
              className="w-full default-radius border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-4"
            />
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <button
              onClick={handleUpdate}
              disabled={loading || !newPwd || !confirmPwd}
              className="w-full default-radius px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 cursor-pointer transition-opacity"
              style={{ backgroundColor: loading || !newPwd || !confirmPwd ? '#aaa' : 'var(--brand-primary)' }}
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </>
        )}

        {step === 'done' && (
          <div className="pt-2 text-center">
            <p className="text-sm text-gray-700 mb-4">Your password has been updated.</p>
            <button onClick={onClose} className="default-radius px-4 py-2 text-sm font-semibold btn-outline-brand cursor-pointer">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
