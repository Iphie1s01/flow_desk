import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { authPool } from './db';
import { sendMail, mailLayout } from './mail';

const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } } : {};

export const auth = betterAuth({
  database: authPool,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      void sendMail(user.email, 'Reset your FlowDesk password', mailLayout('Reset your password', 'Use the button below to choose a new password. The link expires in one hour.', url, 'Choose a new password'));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendMail(user.email, 'Verify your email for FlowDesk', mailLayout('Confirm your email', `Hi ${user.name}, confirm your address to finish setting up FlowDesk.`, url, 'Verify email'));
    },
  },
  socialProviders: google,
  rateLimit: {
    enabled: process.env.NODE_ENV === 'production',
    storage: 'database',
    window: 60, max: 100,
    customRules: { '/sign-in/email': { window: 60, max: 5 }, '/sign-up/email': { window: 60, max: 5 }, '/request-password-reset': { window: 60, max: 3 } },
  },
  plugins: [nextCookies()],   // keep last
});
export const googleEnabled = Object.keys(google).length > 0;
