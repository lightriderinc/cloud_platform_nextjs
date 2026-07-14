export const logtoConfig = {
  endpoint: 'https://bhi5jd.logto.app/',
  appId: 'a3qx8dcty8mhb8bqgvll5',
  appSecret: 'E1BJgatuOhCSNc2Mtqz609vmNkgUPA8k',
  baseUrl: 'http://localhost:3000', // Change to your own base URL
  cookieSecret: 'E3mO9dzSVAyoFCvgHzY1Z8DbvNH2TlEg', // Auto-generated 32 digit secret
  cookieSecure: process.env.NODE_ENV === 'production',
  scopes: ['email', 'profile'],
};