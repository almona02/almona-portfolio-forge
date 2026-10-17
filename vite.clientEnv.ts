import { Buffer } from 'node:buffer';

/** Remove server credentials from Vite's resolved browser environment. Never log values. */
export function sanitizeClientEnv(env: Record<string, unknown>): string[] {
  const removed: string[] = [];
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_')) continue;
    let privilegedToken = false;
    if (typeof value === 'string') {
      privilegedToken = value.startsWith('sb_secret_');
      const parts = value.split('.');
      if (parts.length === 3) {
        try {
          const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { role?: unknown };
          privilegedToken ||= claims.role === 'service_role';
        } catch { /* Not a JWT. */ }
      }
    }
    if (privilegedToken || /SERVICE_ROLE|SERVICE_KEY|DATABASE_URL|DB_URL|PRIVATE_KEY|SENDGRID_API_KEY|SMS_API_KEY|GEMINI_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|STRIPE_SECRET|PAYPAL_SECRET/.test(name)) {
      delete env[name];
      removed.push(name);
    }
  }
  return removed;
}
