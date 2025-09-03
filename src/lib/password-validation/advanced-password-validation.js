// advanced-password-validation.js
import zxcvbn from 'zxcvbn';

export const advancedPasswordValidation = (password, userInputs = []) => {
  const result = zxcvbn(password, userInputs);
  
  const feedback = {
    score: result.score, // 0-4 (0=weak, 4=strong)
    warning: result.feedback.warning,
    suggestions: result.feedback.suggestions,
    crackTime: result.crack_times_display.offline_slow_hashing_1e4_per_second,
    scoreText: ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][result.score]
  };
  
  return {
    isValid: result.score >= 3, // Require at least "Good" strength
    ...feedback
  };
};