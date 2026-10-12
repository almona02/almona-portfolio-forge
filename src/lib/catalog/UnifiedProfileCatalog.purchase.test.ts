import { describe, expect, it, vi } from 'vitest';
import { UnifiedProfileCatalog } from './UnifiedProfileCatalog';
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [] }) }) }) } }));
vi.mock('@/lib/imports/ElsherifPDFExtractor', () => ({ ElsherifPDFExtractor: { extractProfilesFromPDF: async () => [] } }));
describe('purchase catalogue', () => { it('includes explicit PS sash, bead, interlock and track profiles', async () => { const systems = await UnifiedProfileCatalog.getAllSystems('owner'); const ps = systems.find(s => s.id === 'caluminium-ps'); expect(ps?.profiles.map(p => p.profileCode)).toEqual(expect.arrayContaining(['PS-6601-FRAME', 'PS-6601-SASH', 'PS-6601-BEAD', 'PS-6601-TRACK', 'PS-6601-INTERLOCK'])); expect(ps?.profiles.some(p => p.role === 'sash_sliding' || p.role === 'sash')).toBe(true); }); });
