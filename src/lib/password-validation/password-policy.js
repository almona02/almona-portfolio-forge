// password-policy.js
import { commonPasswords } from './common-passwords.js';

export const PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  blacklist: commonPasswords, // from common-passwords.js
  maxAgeDays: 90, // Force password change every 90 days
  historySize: 5, // Remember last 5 passwords
};

// You can also add rate limiting for password attempts