'use client';

import { useState } from 'react';

type Props = {
  currentEmail: string;
  onVerifyPassword: (password: string) => Promise<string>;
  onSendCode: (email: string) => Promise<string>;
  onVerifyCode: (email: string, code: string, verificationRecordId: string) => Promise<void>;
  onUpdateEmail: (currentVerifId: string, newVerifId: string) => Promise<void>;
  onClose: () => void;
};

type Step = 'verify-password' | 'enter-new' | 'verify-new' | 'done';

const STEPS: Step[] = ['verify-password', 'enter-new', 'verify-new'];

export default function EditEmailModal({
  currentEmail,
  onVerifyPassword,
  onSendCode,
  onVerifyCode,
  onUpdateEmail,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('verify-password');
  const [password, setPassword] = useState('');
  const [currentVerifId, setCurrentVerifId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newVerifId, setNewVerifId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleVerifyPassword() {
    setError('');
    setLoading(true);
    try {
      const id = await onVerifyPassword(password);
      setCurrentVerifId(id);
      setStep('enter-new');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Incorrect password');
    } finally {
      setLoading(false);
    }
  }

  async function sendNewCode() {
    if (!newEmail.includes('@')) { setError('Enter a valid email address'); return; }
    setError('');
    setLoading(true);
    try {
      const id = await onSendCode(newEmail);
      setNewVerifId(id);
      setStep('verify-new');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  }

  async function confirmUpdate() {
    setError('');
    setLoading(true);
    try {
      await onVerifyCode(newEmail, newCode, newVerifId);
      await onUpdateEmail(currentVerifId, newVerifId);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update email');
    } finally {
      setLoading(false);
    }
  }

  const btn = (label: string, onClick: () => void, disabled: boolean) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full default-radius px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 cursor-pointer transition-opacity"
      style={{ backgroundColor: disabled ? '#aaa' : 'var(--brand-primary)' }}
    >
      {label}
    </button>
  );

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

        <h2 className="text-lg font-semibold text-gray-800 mb-1">Change Email</h2>

        <div className="flex gap-1.5 mb-4">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="h-1 flex-1 default-radius"
              style={{
                backgroundColor:
                  step === 'done' || STEPS.indexOf(step) >= i
                    ? 'var(--brand-primary)'
                    : '#e5e7eb',
              }}
            />
          ))}
        </div>

        {step === 'verify-password' && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Confirm your password to change the email for{' '}
              <span className="font-medium text-gray-700">{currentEmail}</span>.
            </p>
            <label className="block text-xs text-gray-500 mb-1">Current password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
              autoFocus
              className="w-full default-radius border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-4"
            />
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            {btn(loading ? 'Verifying…' : 'Continue', handleVerifyPassword, loading || !password)}
          </>
        )}

        {step === 'enter-new' && (
          <>
            <p className="text-sm text-gray-500 mb-4">Enter the new email address you want to use.</p>
            <label className="block text-xs text-gray-500 mb-1">New email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendNewCode()}
              autoFocus
              className="w-full default-radius border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-4"
              placeholder="new@example.com"
            />
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            {btn(loading ? 'Sending…' : 'Send verification code', sendNewCode, loading || !newEmail)}
          </>
        )}

        {step === 'verify-new' && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Enter the code sent to <span className="font-medium text-gray-700">{newEmail}</span>.
            </p>
            <label className="block text-xs text-gray-500 mb-1">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && confirmUpdate()}
              maxLength={6}
              autoFocus
              className="w-full default-radius border border-gray-300 px-3 py-2 text-sm tracking-widest focus:outline-none focus:border-gray-400 mb-4"
              placeholder="000000"
            />
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            {btn(loading ? 'Updating…' : 'Confirm & Update Email', confirmUpdate, loading || newCode.length < 6)}
          </>
        )}

        {step === 'done' && (
          <div className="pt-2 text-center">
            <p className="text-sm text-gray-700 mb-1">
              Your email has been updated to{' '}
              <span className="font-medium">{newEmail}</span>.
            </p>
            <p className="text-xs text-gray-500 mb-4">Sign in again to see the change take effect.</p>
            <button onClick={onClose} className="default-radius px-4 py-2 text-sm font-semibold btn-outline-brand cursor-pointer">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
