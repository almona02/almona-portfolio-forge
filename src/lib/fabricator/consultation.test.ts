import { beforeEach, describe, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }));
import { submitFabricationConsultation } from './consultation';
const request = { name: ' Customer ', phone: '+201000000000', projectType: 'renovation' as const, system: 'upvc' as const, message: 'Windows' };
describe('Consultation acknowledgement', () => {
  beforeEach(() => rpc.mockReset());
  it('validates before sending and returns only a server receipt', async () => {
    rpc.mockResolvedValue({ data: 'a16c2d83-11ae-4acb-8cd0-29c202e373a7', error: null });
    expect(await submitFabricationConsultation(request)).toBe('a16c2d83-11ae-4acb-8cd0-29c202e373a7');
    expect(rpc).toHaveBeenCalledWith('submit_fabrication_consultation', expect.objectContaining({ p_name: 'Customer', p_project_type: 'renovation', p_system: 'upvc' }));
  });
  it('does not send invalid contact information', async () => {
    await expect(submitFabricationConsultation({ ...request, phone: '123' })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('does not claim delivery on errors or missing receipts', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'missing function' } });
    await expect(submitFabricationConsultation(request)).rejects.toThrow('not acknowledged');
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(submitFabricationConsultation(request)).rejects.toThrow('receipt');
  });
});
