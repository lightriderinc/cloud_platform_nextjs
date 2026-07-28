export const logtoConfig = {
  endpoint: 'https://bhi5jd.logto.app/',
  appId: 'a3qx8dcty8mhb8bqgvll5',
  appSecret: process.env.LOGTO_APP_SECRET,
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',// Change to your own base URL
  // Cast to string (same idiom as LOGTO_PRO_ROLE_ID elsewhere): proxy.ts's
  // CookieStorage requires a definite encryptionKey since this app doesn't
  // provide a custom sessionWrapper — must be set in every real environment.
  cookieSecret: process.env.LOGTO_COOKIE_SECRET as string, // 32+ character random string
  cookieSecure: process.env.NODE_ENV === 'production',
  proRoleID: "d4px0fafm78qfb574wgfm",
  scopes: ['email', 'profile', 'roles', 'identities'],
};