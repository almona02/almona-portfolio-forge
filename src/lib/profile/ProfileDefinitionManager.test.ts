import { describe, expect, it, vi } from 'vitest';
const database = vi.hoisted(() => ({ insert: vi.fn(), row: {} as Record<string, unknown> }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ insert: (row: Record<string, unknown>) => {
  database.insert(row);
  return { select: () => ({ single: async () => ({ data: { id: 'divider', ...row, ...database.row }, error: null }) }) };
} }) } }));
import { ProfileDefinitionManager } from './ProfileDefinitionManager';
describe('profile definition persistence', () => {
  it('round trips the selected divider role, specifications and weight', async () => {
    const profile = await new ProfileDefinitionManager().createProfileFromDefinition({
      profileCode: 'Test divider', systemName: 'Test pack', width: 50, height: 50,
      materialThickness: 1.8, weightPerMeter: 1.3, role: 'mullion', material: 'aluminum',
      defaultKFactor45: 0, defaultKFactor90: 0, userId: 'owner',
    });
    expect(database.insert.mock.calls.at(-1)?.[0].profile_role).toBe('mullion');
    expect(profile.profileRole).toBe('mullion');
    expect(profile.specifications?.role).toBe('mullion');
    expect(profile.weightPerMeter).toBe(1.3);
  });
});
