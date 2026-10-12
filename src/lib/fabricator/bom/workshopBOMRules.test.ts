import { describe, expect, it } from 'vitest';
import { applyWorkshopBOMRules, workshopBOMRules, type WorkshopBOMRule } from './workshopBOMRules';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
const pose = { overallWidth: 1200, overallHeight: 1400, grid: { cells: [{ type: 'sliding' }, { type: 'sliding' }] } } as WindowUnit;
const rule = { id: 'seal', name: 'Gasket', kind: 'accessory', category: 'seal', basis: 'perimeter', quantity: 1, unitPrice: 10, enabled: true } as WorkshopBOMRule;
const pack = (rules: WorkshopBOMRule[]) => ({ windowSystemSpec: { workshop_bom_rules: rules } } as unknown as SystemPack);
describe('workshop requirements', () => {
    it('calculates perimeter gasket quantities and replaces the standard category', () => { const result = applyWorkshopBOMRules(pack([rule]), pose, [], [{ id: 'old', name: 'Old seal', category: 'seal', quantity: 1, unitPrice: 1, totalCost: 1, supplier: '' }]); expect(result.accessories).toHaveLength(1); expect(result.accessories[0].quantity).toBe(5.2); expect(result.accessories[0].totalCost).toBe(52); expect(result.accessories[0].unit).toBe('metre'); });
    it('counts operating sashes and permits explicitly disabling a category', () => { const hardware = [{ id: 'old', category: 'hinge', name: 'Hinge', quantity: 9 }] as never; const r = { ...rule, kind: 'hardware' as const, category: 'hinge', basis: 'sash' as const, quantity: 2 }; expect(applyWorkshopBOMRules(pack([r]), pose, hardware, []).hardware[0].quantity).toBe(4); expect(applyWorkshopBOMRules(pack([{ ...r, enabled: false }]), pose, hardware, []).hardware).toHaveLength(0); });
    it('rejects invalid and ambiguous requirements', () => { expect(() => workshopBOMRules(pack([{ ...rule, quantity: NaN }]))).toThrow(); expect(() => workshopBOMRules(pack([rule, { ...rule, id: 'another' }]))).toThrow(); });
});
