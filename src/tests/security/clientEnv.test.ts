import { describe, expect, it } from 'vitest';
import { sanitizeClientEnv } from '../../../scripts/build/publicEnv';

describe('browser environment sanitization', () => {
  it('removes privileged names without removing public configuration', () => {
    const env = { VITE_SMS_API_KEY: 'test-secret', VITE_SUPABASE_SERVICE_ROLE_KEY: 'test-secret',
      VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_MAPS_API_KEY: 'public-map-key',
      SUPABASE_SERVICE_KEY: 'server-only' };
    expect(sanitizeClientEnv(env)).toHaveLength(2);
    expect(env).not.toHaveProperty('VITE_SMS_API_KEY');
    expect(env).toHaveProperty('VITE_MAPS_API_KEY');
    expect(env).toHaveProperty('SUPABASE_SERVICE_KEY');
  });
  it('detects service-role credentials under misleading public key names', () => {
    const payload = btoa(JSON.stringify({ role: 'service_role' }));
    const env = { VITE_SUPABASE_ANON_KEY: `header.${payload}.signature`, VITE_OTHER_KEY: 'sb_secret_test' };
    expect(sanitizeClientEnv(env)).toHaveLength(2);
    expect(Object.keys(env)).toHaveLength(0);
  });
});
