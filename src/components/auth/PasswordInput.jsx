// PasswordInput.jsx
import React, { useState } from 'react';
import { validatePassword, isCommonPassword } from '../../lib/password-validation/password-validation';
import { advancedPasswordValidation } from '../../lib/password-validation/advanced-password-validation';

const PasswordInput = ({ onPasswordChange }) => {
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState({ isValid: false, errors: [] });

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    
    // Basic validation
    const basicValidation = validatePassword(newPassword);
    
    // Check for common passwords
    if (isCommonPassword(newPassword)) {
      basicValidation.errors.push('This password is too common and easily guessable');
      basicValidation.isValid = false;
    }
    
    // Advanced validation (optional)
    const advancedValidation = advancedPasswordValidation(newPassword, [
      'almona', 'industrial', 'ecommerce' // Add context-specific words
    ]);
    
    setValidation({
      ...basicValidation,
      strength: advancedValidation.scoreText,
      crackTime: advancedValidation.crackTime
    });
    
    onPasswordChange(newPassword, basicValidation.isValid);
  };

  return (
    <div className="password-input">
      <label htmlFor="password">Password</label>
      <input
        type="password"
        id="password"
        value={password}
        onChange={handlePasswordChange}
        placeholder="Enter your password"
        className={validation.isValid ? 'valid' : 'invalid'}
      />
      
      {password && (
        <div className="password-feedback">
          <div className={`strength strength-${validation.strength?.toLowerCase()}`}>
            Strength: {validation.strength || 'Very Weak'}
          </div>
          {validation.crackTime && (
            <div className="crack-time">
              Estimated crack time: {validation.crackTime}
            </div>
          )}
          {validation.errors.length > 0 && (
            <div className="errors">
              {validation.errors.map((error, index) => (
                <div key={index} className="error">⚠️ {error}</div>
              ))}
            </div>
          )}
          {validation.isValid && (
            <div className="success">✅ Password meets all requirements</div>
          )}
        </div>
      )}
    </div>
  );
};

export default PasswordInput;