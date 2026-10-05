import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
const { resolve } = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner-user' } }) }));
vi.mock('@/lib/persona/personaResolver', () => ({ resolvePersona: resolve, invalidatePersonaCache: vi.fn(), onPersonaCacheInvalidate: () => () => {} }));
import { usePersona } from './usePersona';

describe('Persona authority', () => {
  it('ignores URL role flags and keeps authenticated resolution', async () => {
    window.history.replaceState({}, '', '/?role=owner');
    resolve.mockResolvedValue({ persona: 'operator', visibleTabs: ['production'], permissions: { canManageUsers: false }, confidence: 'high', source: 'database' });
    const { result } = renderHook(() => usePersona());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(resolve).toHaveBeenCalledWith('owner-user');
    expect(result.current.persona).toBe('operator');
    expect(result.current.source).not.toBe('url_override');
    window.history.replaceState({}, '', '/');
  });
});
