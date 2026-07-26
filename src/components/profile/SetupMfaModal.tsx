'use client';

import { useState } from 'react';

import CopyButton from '@/components/ui/CopyButton';
import QrCode from '@/components/ui/QrCode';
import VerifyIdentity from '@/components/profile/VerifyIdentity';

type Props = {
  email: string;
  /** Label shown in the authenticator app (e.g. the product name). */
  issuer: string;
  onVerifyPassword: (password: string) => Promise<string>;
  onSendEmailCode: (email: string) => Promise<string>;
  onVerifyEmailCode: (
    email: string,
    code: string,
    verificationRecordId: string,
  ) => Promise<string>;
  onGenerateSecret: () => Promise<string>;
  onBind: (verificationRecordId: string, secret: string, code: string) => Promise<void>;
  onSuccess: () => void;
  onClose: () => void;
};

type Step = 'verify' | 'scan' | 'confirm' | 'done';

const STEPS: Step[] = ['verify', 'scan', 'confirm'];

/**
 * Guides the user through enabling 2FA with an authenticator app (TOTP):
 * verify identity -> scan the QR / copy the key -> confirm a 6-digit code.
 */
export default function SetupMfaModal({
  email,
  issuer,
  onVerifyPassword,
  onSendEmailCode,
  onVerifyEmailCode,
  onGenerateSecret,
  onBind,
  onSuccess,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('verify');
  const [verificationId, setVerificationId] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totpUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(
    email,
  )}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

  // Runs after identity is confirmed: stash the record id and fetch a secret.
  // Anything thrown here surfaces inside the VerifyIdentity step.
  async function handleVerified(id: string) {
    setVerificationId(id);
    const generated = await onGenerateSecret();
    setSecret(generated);
    setStep('scan');
  }

  async function handleBind() {
    setError('');
    setLoading(true);
    try {
      await onBind(verificationId, secret, code);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code did not match. Try again.');
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

        <h2 className="text-lg font-semibold text-gray-800 mb-1">
          Set up two-factor authentication
        </h2>

        <div className="flex gap-1.5 mb-4 mt-3">
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

        {step === 'verify' && (
          <>
            <p className="text-sm text-gray-500 mb-4">Confirm it is you to start setup.</p>
            <VerifyIdentity
              email={email}
              onVerifyPassword={onVerifyPassword}
              onSendEmailCode={onSendEmailCode}
              onVerifyEmailCode={onVerifyEmailCode}
              onVerified={handleVerified}
              submitLabel="Continue"
            />
          </>
        )}

        {step === 'scan' && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password,
              and similar), or enter the key manually.
            </p>
            <div className="flex justify-center mb-4">
              <QrCode value={totpUri} />
            </div>
            <label className="block text-xs text-gray-500 mb-1">Setup key</label>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 default-radius border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 break-all">
                {secret}
              </code>
              <CopyButton value={secret} label={null} />
            </div>
            <button
              onClick={() => {
                setError('');
                setStep('confirm');
              }}
              className="w-full default-radius px-4 py-2 text-sm font-semibold text-white cursor-pointer transition-opacity"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Next
            </button>
          </>
        )}

        {step === 'confirm' && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Enter the 6-digit code shown in your authenticator app to finish.
            </p>
            <label className="block text-xs text-gray-500 mb-1">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && code.length >= 6 && !loading && handleBind()}
              maxLength={6}
              autoFocus
              className="w-full default-radius border border-gray-300 px-3 py-2 text-sm tracking-widest focus:outline-none focus:border-gray-400 mb-4"
              placeholder="000000"
            />
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <button
              onClick={handleBind}
              disabled={loading || code.length < 6}
              className="w-full default-radius px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 cursor-pointer transition-opacity"
              style={{ backgroundColor: loading || code.length < 6 ? '#aaa' : 'var(--brand-primary)' }}
            >
              {loading ? 'Verifying…' : 'Enable 2FA'}
            </button>
          </>
        )}

        {step === 'done' && (
          <div className="pt-2 text-center">
            <p className="text-sm text-gray-700 mb-4">
              Two-factor authentication is on. You will be asked for a code from your authenticator
              app when you sign in.
            </p>
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="default-radius px-4 py-2 text-sm font-semibold btn-outline-brand cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
