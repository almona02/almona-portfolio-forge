import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { WindowUnit } from '@/types/fabricator';
import { PurchaseOrderDraftPanel } from './PurchaseOrderDraftPanel';
vi.mock('@/data/systemPacks', () => ({ SYSTEM_PACKS: [] }));
vi.mock('@/lib/fabricator/systemPackSupabase', () => ({ loadCustomSystemsFromSupabase: async () => [] }));
vi.mock('@/lib/fabricator/inventory/purchaseOrderDraft', () => ({ buildPurchaseOrderLines: (bom: CompleteBOM, pose: WindowUnit) => bom.accessories.map(item => ({ code: item.id, name: item.name, category: 'accessory', quantity: item.quantity * (pose.quantity ?? 1), unit: 'metre', unitPrice: item.unitPrice })), purchaseOrderCsv: () => 'CSV' }));
const pose = { id: 'pose', projectCode: 'project', quantity: 5 } as WindowUnit;
const bom = { profiles: [], hardware: [], glazing: [], accessories: [{ id: 'seal', name: 'Gasket', category: 'seal', quantity: 1, unitPrice: 2, totalCost: 2, supplier: 'Workshop', unit: 'metre' }] } as unknown as CompleteBOM;
beforeEach(() => { localStorage.clear(); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {}); Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:draft') }); Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function open() { fireEvent.click(screen.getByRole('button', { name: 'Create purchase order from active BOM' })); }
function save() { fireEvent.change(screen.getByLabelText('Purchase order supplier'), { target: { value: 'Supplier' } }); fireEvent.click(screen.getByRole('button', { name: 'Save draft & export purchase order' })); }
describe('purchase draft restoration', () => {
 it('rebuilds gasket demand when the BOM changes while profile demand stays identical', () => { const { rerender } = render(<PurchaseOrderDraftPanel bom={bom} pose={pose} ownerId="owner" revision={4} />); open(); fireEvent.change(screen.getByLabelText('Order quantity seal'), { target: { value: '99' } }); save(); const changed = { ...bom, accessories: [{ ...bom.accessories[0], quantity: 2 }] }; rerender(<PurchaseOrderDraftPanel bom={changed} pose={pose} ownerId="owner" revision={4} />); open(); expect(screen.getByLabelText('Order quantity seal')).toHaveValue(10); });
 it('restores the saved stock length and kerf with an unchanged BOM', () => { const first = render(<PurchaseOrderDraftPanel bom={bom} pose={pose} ownerId="owner" revision={4} />); open(); fireEvent.change(screen.getByLabelText('Proposed order stock length'), { target: { value: '6500' } }); fireEvent.change(screen.getByLabelText('Proposed order kerf'), { target: { value: '4' } }); save(); first.unmount(); render(<PurchaseOrderDraftPanel bom={bom} pose={pose} ownerId="owner" revision={4} />); open(); expect(screen.getByLabelText('Proposed order stock length')).toHaveValue(6500); expect(screen.getByLabelText('Proposed order kerf')).toHaveValue(4); });
});
