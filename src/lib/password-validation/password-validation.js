// password-validation.js
export const validatePassword = (password) => {
  const errors = [];
  
  // Minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Contains uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Contains lowercase
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Contains number
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Contains special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};