'use client';

import { useState } from 'react';

type Props = {
  /** The user's current email, used for the email-code verification path. */
  email: string;
  onVerifyPassword: (password: string) => Promise<string>;
  onSendEmailCode: (email: string) => Promise<string>;
  onVerifyEmailCode: (
    email: string,
    code: string,
    verificationRecordId: string,
  ) => Promise<string>;
  /**
   * Called with a Logto verification record id once identity is confirmed.
   * May be async; anything it throws is surfaced inline as an error.
   */
  onVerified: (verificationRecordId: string) => void | Promise<void>;
  submitLabel?: string;
};

type Method = 'password' | 'email';

/**
 * Reusable "confirm it is you" step. Lets the user prove their identity with
 * either their password or a one-time email code, then hands the resulting
 * verification record id back to the parent via `onVerified`.
 *
 * Shared by the MFA setup and disable modals so the two flows stay consistent.
 */
export default function VerifyIdentity({
  email,
  onVerifyPassword,
  onSendEmailCode,
  onVerifyEmailCode,
  onVerified,
  submitLabel = 'Continue',
}: Props) {
  const [method, setMethod] = useState<Method>('password');
  const [password, setPassword] = useState('');
  const [emailStage, setEmailStage] = useState<'send' | 'code'>('send');
  const [code, setCode] = useState('');
  const [sentId, setSentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function switchMethod(next: Method) {
    if (next === method) return;
    setMethod(next);
    setError('');
    setEmailStage('send');
    setCode('');
    setPassword('');
  }

  async function verifyWithPassword() {
    setError('');
    setLoading(true);
    try {
      const id = await onVerifyPassword(password);
      await onVerified(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Incorrect password');
      setLoading(false);
    }
  }

  async function sendCode() {
    setError('');
    setLoading(true);
    try {
      const id = await onSendEmailCode(email);
      setSentId(id);
      setEmailStage('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  }

  async function verifyWithCode() {
    setError('');
    setLoading(true);
    try {
      const verifiedId = await onVerifyEmailCode(email, code, sentId);
      await onVerified(verifiedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid code');
      setLoading(false);
    }
  }

  const tabClass = (active: boolean) =>
    `flex-1 default-radius border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
      active
        ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
    }`;

  const primaryBtn = (label: string, onClick: () => void, isDisabled: boolean) => (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className="w-full default-radius px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 cursor-pointer transition-opacity"
      style={{ backgroundColor: isDisabled ? '#aaa' : 'var(--brand-primary)' }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          className={tabClass(method === 'password')}
          onClick={() => switchMethod('password')}
        >
          Password
        </button>
        <button
          type="button"
          className={tabClass(method === 'email')}
          onClick={() => switchMethod('email')}
        >
          Email code
        </button>
      </div>

      {method === 'password' && (
        <>
          <label className="block text-xs text-gray-500 mb-1">Current password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && password && !loading && verifyWithPassword()}
            autoFocus
            className="w-full default-radius border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 mb-4"
          />
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          {primaryBtn(loading ? 'Verifying…' : submitLabel, verifyWithPassword, loading || !password)}
        </>
      )}

      {method === 'email' && emailStage === 'send' && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            A verification code will be sent to{' '}
            <span className="font-medium text-gray-700">{email}</span>.
          </p>
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          {primaryBtn(loading ? 'Sending…' : 'Send code', sendCode, loading)}
        </>
      )}

      {method === 'email' && emailStage === 'code' && (
        <>
          <label className="block text-xs text-gray-500 mb-1">Verification code</label>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && code.length >= 6 && !loading && verifyWithCode()}
            maxLength={6}
            autoFocus
            className="w-full default-radius border border-gray-300 px-3 py-2 text-sm tracking-widest focus:outline-none focus:border-gray-400 mb-4"
            placeholder="000000"
          />
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          {primaryBtn(loading ? 'Verifying…' : submitLabel, verifyWithCode, loading || code.length < 6)}
        </>
      )}
    </>
  );
}
