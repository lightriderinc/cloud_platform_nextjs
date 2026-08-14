export const logtoConfig = {
  managementEndpoint: process.env.LOGTO_MANAGEMENT_ENDPOINT as string, // Change to your own management endpoint
  endpoint: process.env.LOGTO_ENDPOINT as string, // Change to your own endpoint
  appId: process.env.LOGTO_APP_ID, // Change to your own app ID
  appSecret: process.env.LOGTO_APP_SECRET as string, // Change to your own app secret
  baseUrl: process.env.NEXT_BASE_URL || 'http://localhost:3000', // Change to your own base URL
  cookieSecret: process.env.LOGTO_COOKIE_SECRET as string, // Auto-generated 32 digit secret
  cookieSecure: process.env.NODE_ENV === 'production',
  proRoleID: process.env.LOGTO_PRO_ROLE_ID, // Change to your own role ID
};