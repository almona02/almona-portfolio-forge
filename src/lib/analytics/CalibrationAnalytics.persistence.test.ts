import { describe, expect, it, vi } from 'vitest';
import { calibrationAnalytics } from './CalibrationAnalytics';
const mocks = vi.hoisted(() => ({ insert: vi.fn().mockResolvedValue({ error: null }), session: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'owner' } } } }) }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: mocks.session }, from: () => ({ insert: mocks.insert }) } }));
describe('calibration event storage', () => {
    it('uses an accepted table event and authenticated owner while retaining the subtype', async () => {
        await calibrationAnalytics.recordVerificationEvent({ userId: 'spoofed', systemPackId: 'pack', measurements: {}, calculations: {}, durationSeconds: 1, timestamp: new Date() } as never);
        expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'owner', event_type: 'calibration_applied', event_data: expect.objectContaining({ event_subtype: 'verification_gate' }) }));
    });
    it('does not try to write ownerless analytics', async () => { mocks.insert.mockClear(); mocks.session.mockResolvedValueOnce({ data: { session: null } }); await calibrationAnalytics.recordVerificationEvent({ timestamp: new Date() } as never); expect(mocks.insert).not.toHaveBeenCalled(); });
});
