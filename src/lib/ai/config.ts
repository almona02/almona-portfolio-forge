export function validateEnv(vars: string[], module: string) {
  const missing = vars.filter(v => !import.meta.env[v]);
  if (missing.length) {
    throw new Error(`${module} missing env vars: ${missing.join(', ')}`);
  }
  return true;
}

export const AI_ENV_VARS = [
  'VITE_GEMINI_KEY',
  'VITE_TFJS_MODEL_URL',
  'VITE_AI_API_ENDPOINT'
];

export function validateAIEnv() {
  return validateEnv(AI_ENV_VARS, 'AI');
}
