// common-passwords.js
export const commonPasswords = [
  'password', '123456', '12345678', '123456789', 'qwerty',
  'abc123', 'password1', 'admin', 'letmein', 'welcome',
  'monkey', 'sunshine', 'password123', 'admin123', 'welcome123',
  'qwerty123', 'football', 'baseball', 'superman', 'iloveyou',
  '123123', '1234567', '1234567890', '000000', '111111',
  // Add more common passwords as needed
];

export const isCommonPassword = (password) => {
  return commonPasswords.includes(password.toLowerCase());
};