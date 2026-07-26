'use client';

import { useState } from 'react';

import VerifyIdentity from '@/components/profile/VerifyIdentity';

type Props = {
  email: string;
  onVerifyPassword: (password: string) => Promise<string>;
  onSendEmailCode: (email: string) => Promise<string>;
  onVerifyEmailCode: (
    email: string,
    code: string,
    verificationRecordId: string,
  ) => Promise<string>;
  onDisable: (verificationRecordId: string) => Promise<void>;
  onSuccess: () => void;
  onClose: () => void;
};

type Step = 'verify' | 'done';

/**
 * Confirms identity, then removes the user's MFA factors to turn 2FA off.
 */
export default function DisableMfaModal({
  email,
  onVerifyPassword,
  onSendEmailCode,
  onVerifyEmailCode,
  onDisable,
  onSuccess,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('verify');

  // Thrown errors surface inside the VerifyIdentity step.
  async function handleVerified(id: string) {
    await onDisable(id);
    setStep('done');
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
          Turn off two-factor authentication
        </h2>

        {step === 'verify' && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Confirm it is you. This removes your authenticator app and turns off 2FA for your
              account.
            </p>
            <VerifyIdentity
              email={email}
              onVerifyPassword={onVerifyPassword}
              onSendEmailCode={onSendEmailCode}
              onVerifyEmailCode={onVerifyEmailCode}
              onVerified={handleVerified}
              submitLabel="Turn off 2FA"
            />
          </>
        )}

        {step === 'done' && (
          <div className="pt-2 text-center">
            <p className="text-sm text-gray-700 mb-4">Two-factor authentication is off.</p>
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
