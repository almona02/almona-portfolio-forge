import type { CompleteBOM } from '../PresetAwareBOMGenerator';
import type { WindowUnit } from '@/types/fabricator';
import { optimizeLinearCuts } from '@/lib/algorithms/LinearOptimizer';
export interface PurchaseOrderLine {
    code: string;
    name: string;
    category: string;
    quantity: number;
    unit: 'bar' | 'piece' | 'metre';
    stockLengthMm?: number;
    unitPrice: number;
}
export function buildPurchaseOrderLines(bom: CompleteBOM, pose: WindowUnit, stockLengthMm = 6000, kerfMm = 3): PurchaseOrderLine[] {
    if (!Number.isFinite(stockLengthMm) || stockLengthMm <= 0 || !Number.isFinite(kerfMm) || kerfMm < 0)
        throw new Error('Valid stock length and kerf are required.');
    const quantity = pose.quantity ?? 1;
    if (!Number.isSafeInteger(quantity) || quantity < 1)
        throw new Error('Pose quantity must be a positive integer.');
    const lines: PurchaseOrderLine[] = bom.profiles.map(profile => {
        const result = optimizeLinearCuts(profile.cuttingLengths.map((length, index) => ({ id: profile.id + ':' + index, length, quantity, label: profile.profileCode || profile.id })), stockLengthMm, kerfMm, 0);
        if (result.stockUsed.reduce((n, b) => n + b.cuts.length, 0) !== profile.cuttingLengths.length * quantity)
            throw new Error('A profile cut cannot fit the proposed stock.');
        const unitMetres = profile.cuttingLengths.reduce((n, l) => n + l, 0) / 1000;
        return { code: profile.profileCode || profile.id, name: profile.role || profile.profileCode, category: 'profile', quantity: result.barsCount, unit: 'bar', stockLengthMm,
            unitPrice: unitMetres > 0 ? profile.cost / unitMetres * stockLengthMm / 1000 : 0 };
    });
    for (const item of bom.hardware)
        lines.push({ code: item.supplierCode || item.id, name: item.name, category: 'hardware', quantity: item.quantity * quantity, unit: 'piece', unitPrice: Number(item.metadata?.unitPriceEgp ?? 0) });
    for (const item of bom.accessories)
        lines.push({ code: item.id, name: item.name, category: 'accessory', quantity: item.quantity * quantity, unit: item.unit ?? 'piece', unitPrice: item.unitPrice });
    return lines;
}
export function purchaseOrderCsv(lines: PurchaseOrderLine[], supplier: string, reference: string): string {
    if (!supplier.trim() || !reference.trim())
        throw new Error('Supplier and order reference are required.');
    if (!lines.length) throw new Error('Add at least one reviewed order item.');
    const cell = (v: unknown) => '"' + ((v as string) ?? '').replace(/^(?=[\t\r\n ]*[=+@-])/, "'").replace(/"/g, '""') + '"';
    const rows: unknown[][] = [['Order', reference], ['Supplier', supplier], ['Status', 'Draft — verify catalogue mappings, stock length, units and prices before ordering'], [], ['Code', 'Name', 'Category', 'Quantity', 'Unit', 'Stock mm', 'Unit price EGP', 'Total EGP']];
    for (const l of lines) {
        if (!l.code?.trim() || !l.name?.trim() || /^unknown$/i.test(l.code.trim()) || /^hardware item$/i.test(l.name.trim())) throw new Error('Replace unknown item names and supplier codes before exporting.');
        if (!['bar', 'piece', 'metre'].includes(l.unit) || (l.unit !== 'metre' && !Number.isSafeInteger(l.quantity))) throw new Error('Bars and pieces require whole quantities; confirm the order unit.');
        if (!Number.isFinite(l.quantity) || l.quantity <= 0 || !Number.isFinite(l.unitPrice) || l.unitPrice < 0)
            throw new Error('Invalid order quantity or price.');
        rows.push([l.code, l.name, l.category, l.quantity, l.unit, l.stockLengthMm ?? '', l.unitPrice, l.quantity * l.unitPrice]);
    }
    return '\uFEFF' + rows.map(r => r.map(cell).join(',')).join('\r\n');
}
