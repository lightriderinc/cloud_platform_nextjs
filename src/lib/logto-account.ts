const BASE = 'https://bhi5jd.logto.app';

type JsonError = { message?: string };

async function throwOnError(res: Response): Promise<void> {
  if (!res.ok) {
    const data: JsonError = await res.json().catch(() => ({}));
    throw new Error(data.message ?? `Request failed (${res.status})`);
  }
}

export async function getMyProfile(
  accessToken: string
): Promise<{ profile?: { birthdate?: string; givenName?: string; familyName?: string } } | null> {
  const res = await fetch(`${BASE}/api/my-account`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export async function updateBirthdate(accessToken: string, birthdate: string): Promise<void> {
  const res = await fetch(`${BASE}/api/my-account/profile`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ birthdate }),
  });
  await throwOnError(res);
}

export async function updateName(accessToken: string, name: string): Promise<void> {
  const res = await fetch(`${BASE}/api/my-account`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  await throwOnError(res);
}

export async function updateAvatar(accessToken: string, avatarUrl: string): Promise<void> {
  const res = await fetch(`${BASE}/api/my-account`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ avatar: avatarUrl }),
  });
  await throwOnError(res);
}

export async function verifyPassword(accessToken: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/api/verifications/password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });
  await throwOnError(res);
  const data = (await res.json()) as { verificationRecordId: string };
  return data.verificationRecordId;
}

export async function updatePassword(
  accessToken: string,
  verificationRecordId: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${BASE}/api/my-account/password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'logto-verification-id': verificationRecordId,
    },
    body: JSON.stringify({ password: newPassword }),
  });
  await throwOnError(res);
}

export async function sendEmailCode(accessToken: string, email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/verifications/verification-code`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identifier: { type: 'email', value: email } }),
  });
  await throwOnError(res);
  const data = (await res.json()) as { verificationRecordId: string };
  return data.verificationRecordId;
}

export async function verifyEmailCode(
  accessToken: string,
  email: string,
  code: string,
  verificationRecordId: string
): Promise<string> {
  const res = await fetch(`${BASE}/api/verifications/verification-code/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifier: { type: 'email', value: email },
      code,
      verificationId: verificationRecordId,
    }),
  });
  await throwOnError(res);
  const data = (await res.json()) as { verificationRecordId: string };
  return data.verificationRecordId;
}

export async function updatePrimaryEmail(
  accessToken: string,
  identityVerificationRecordId: string,
  newEmailVerificationRecordId: string,
  newEmail: string
): Promise<void> {
  const res = await fetch(`${BASE}/api/my-account/primary-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'logto-verification-id': identityVerificationRecordId,
    },
    body: JSON.stringify({
      email: newEmail,
      newIdentifierVerificationRecordId: newEmailVerificationRecordId,
    }),
  });
  await throwOnError(res);
}

// ---------------------------------------------------------------------------
// Multi-factor authentication (MFA)
// Docs: https://docs.logto.io/end-user-flows/account-settings/by-account-api
// Prerequisites (configured in the Logto Console, not in code):
//   1. Sign-in & account > Account center: enable Account API, set `mfa` = Edit.
//   2. Multi-factor auth: enable MFA and the Authenticator app (TOTP) factor.
//   3. The access token must carry the `identities` scope (see src/app/logto.ts).
// Binding a factor first requires a verification record id proving the user's
// identity (via verifyPassword or the email-code flow above), passed as the
// `logto-verification-id` header.
// ---------------------------------------------------------------------------

export type MfaVerification = {
  id: string;
  type: 'Totp' | 'WebAuthn' | 'BackupCode' | string;
  name?: string;
  agent?: string;
  createdAt?: string;
  updatedAt?: string;
};

/** List the current user's bound MFA factors. Returns [] when none or forbidden. */
export async function getMfaVerifications(accessToken: string): Promise<MfaVerification[]> {
  const res = await fetch(`${BASE}/api/my-account/mfa-verifications`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return (await res.json()) as MfaVerification[];
}

/** Generate a new TOTP secret (base32) to render as a QR code / manual key. */
export async function generateTotpSecret(accessToken: string): Promise<string> {
  const res = await fetch(`${BASE}/api/my-account/mfa-verifications/totp-secret/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  await throwOnError(res);
  const data = (await res.json()) as { secret: string };
  return data.secret;
}

/**
 * Bind (or replace) the user's TOTP factor. Uses the idempotent
 * create-or-replace endpoint (PUT) so the 6-digit `code` from the authenticator
 * app is validated, confirming setup before 2FA is enabled. Being idempotent,
 * it is also safe to retry and avoids the "one TOTP at a time" 422 conflict.
 */
export async function bindTotp(
  accessToken: string,
  verificationRecordId: string,
  secret: string,
  code: string
): Promise<void> {
  const res = await fetch(`${BASE}/api/my-account/mfa-verifications/totp`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'logto-verification-id': verificationRecordId,
    },
    body: JSON.stringify({ secret, code }),
  });
  await throwOnError(res);
}

/** Remove a bound MFA factor by its verification id (used to disable 2FA). */
export async function deleteMfaVerification(
  accessToken: string,
  verificationRecordId: string,
  mfaVerificationId: string
): Promise<void> {
  const res = await fetch(`${BASE}/api/my-account/mfa-verifications/${mfaVerificationId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'logto-verification-id': verificationRecordId,
    },
  });
  await throwOnError(res);
}
