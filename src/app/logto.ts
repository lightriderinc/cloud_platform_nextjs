export const logtoConfig = {
  managementEndpoint: 'https://4e7d0k.logto.app/',
  endpoint: 'https://4e7d0k.logto.app/',
  appId: 'vqq5tqptgjud45vt23yfs',
  appSecret: process.env.LOGTO_APP_SECRET ,
  baseUrl: process.env.NEXT_BASE_URL || 'http://localhost:3000', // Change to your own base URL
  cookieSecret: process.env.LOGTO_COOKIE_SECRET as string, // Auto-generated 32 digit secret
  cookieSecure: process.env.NODE_ENV === 'production',
  proRoleID: "d4px0fafm78qfb574wgfm",
};