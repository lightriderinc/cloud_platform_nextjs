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
