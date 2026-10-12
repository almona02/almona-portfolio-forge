import { describe, expect, it } from 'vitest';
import { buildPurchaseOrderLines, purchaseOrderCsv } from './purchaseOrderDraft';
import type { CompleteBOM } from '../PresetAwareBOMGenerator';
import type { WindowUnit } from '@/types/fabricator';
const bom = { profiles: [{ id: 'frame', profileCode: 'FRAME', role: 'frame', cuttingLengths: [2800, 2800], cost: 56 }], hardware: [{ id: 'hinge', name: 'Hinge', quantity: 2 }], accessories: [{ id: 'gasket', name: 'Gasket', quantity: 5.2, unitPrice: 10, unit: 'metre' }] } as unknown as CompleteBOM;
describe('purchase order draft', () => {
    it('packs every repeated cut and includes hardware and gasket demand', () => { const lines = buildPurchaseOrderLines(bom, { quantity: 5 } as WindowUnit); expect(lines[0].quantity).toBe(5); expect(lines[1].quantity).toBe(10); expect(lines[2].quantity).toBe(26); expect(lines[2].unit).toBe('metre'); });
    it('fails closed when pieces cannot fit or settings are invalid', () => { expect(() => buildPurchaseOrderLines(bom, { quantity: 5 } as WindowUnit, 2000)).toThrow(); expect(() => buildPurchaseOrderLines(bom, { quantity: 0 } as WindowUnit)).toThrow(); });
    it('requires supplier data and escapes spreadsheet formula content', () => { const lines = buildPurchaseOrderLines(bom, { quantity: 1 } as WindowUnit); expect(() => purchaseOrderCsv(lines, '', 'PO1')).toThrow(); const csv = purchaseOrderCsv(lines, '=malicious', 'PO1'); expect(csv).toContain("'="); expect(csv).toContain('FRAME'); expect(csv).toContain('Draft'); });
});
