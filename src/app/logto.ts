// Logto configuration for this app. Env var names are shared across every
// Light Rider platform — see docs/adding-a-new-platform.md for the canonical
// list. NEXT_BASE_URL (not LOGTO_BASE_URL) is the one name for this app's own
// origin; it is what every redirect URI is built from.
export const logtoConfig = {
  managementEndpoint: process.env.LOGTO_MANAGEMENT_ENDPOINT as string, // M2M-only; not needed by apps without Management API access
  endpoint: process.env.LOGTO_ENDPOINT as string,
  appId: process.env.LOGTO_APP_ID as string,
  appSecret: process.env.LOGTO_APP_SECRET as string,
  // Fallback matches this app's pinned dev port (see package.json "dev").
  // A wrong fallback here silently produces a redirect_uri Logto will reject.
  baseUrl: process.env.NEXT_BASE_URL || 'http://localhost:3001',
  cookieSecret: process.env.LOGTO_COOKIE_SECRET as string,
  cookieSecure: process.env.NODE_ENV === 'production',
  proRoleID: process.env.LOGTO_PRO_ROLE_ID as string, // Cloud-only: Stripe -> Logto role sync
  scopes: ['email', 'profile', 'roles', 'identities'],
};