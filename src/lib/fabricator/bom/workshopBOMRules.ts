import type { SystemPack, WindowUnit } from '@/types/fabricator';
import type { CompleteBOM } from '../PresetAwareBOMGenerator';
import { leafOpeningOp } from './leafOpening';
export interface WorkshopBOMRule {
    id: string;
    name: string;
    kind: 'hardware' | 'accessory';
    category: string;
    basis: 'window' | 'sash' | 'perimeter';
    quantity: number;
    unitPrice: number;
    enabled: boolean;
}
export function workshopBOMRules(pack: SystemPack): WorkshopBOMRule[] {
    const raw = (pack.windowSystemSpec as unknown as Record<string, unknown>)?.workshop_bom_rules;
    if (raw == null)
        return [];
    if (!Array.isArray(raw))
        throw new Error('Workshop BOM requirements must be a list.');
    const ids = new Set<string>();
    return raw.map((item: WorkshopBOMRule) => {
        if (!item || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || typeof item.category !== 'string' || !item.category.trim() || !['hardware', 'accessory'].includes(item.kind) || !['window', 'sash', 'perimeter'].includes(item.basis) || typeof item.enabled !== 'boolean' || !Number.isFinite(item.quantity) || item.quantity < 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)
            throw new Error('Invalid workshop BOM requirement.');
        if (ids.has(item.kind + ':' + item.category))
            throw new Error('Each category can have only one workshop override.');
        if (item.kind === 'hardware' && (!['hinge', 'lock', 'handle', 'roller', 'corner_key', 'gasket', 'hardener'].includes(item.category) || item.basis === 'perimeter' || !Number.isSafeInteger(item.quantity)))
            throw new Error('Hardware requires a supported category and whole quantities per window or sash.');
        ids.add(item.id);
        ids.add(item.kind + ':' + item.category);
        return { ...item };
    });
}
export function applyWorkshopBOMRules(pack: SystemPack, pose: WindowUnit, hardware: CompleteBOM['hardware'], accessories: CompleteBOM['accessories']) {
    const rules = workshopBOMRules(pack);
    let nextHardware = [...hardware], nextAccessories = [...accessories];
    for (const rule of rules) {
        const sashCount = (pose.grid?.cells ?? []).filter(cell => ['side-hung', 'top-hung', 'tilt-turn', 'sliding'].includes(leafOpeningOp(cell))).length;
        const factor = rule.basis === 'sash' ? sashCount : rule.basis === 'perimeter' ? (pose.overallWidth + pose.overallHeight) * 2 / 1000 : 1;
        const quantity = rule.quantity * factor;
        if (!Number.isFinite(quantity) || quantity < 0)
            throw new Error('Invalid workshop BOM quantity.');
        if (rule.kind === 'hardware') {
            nextHardware = nextHardware.filter(item => item.category !== rule.category);
            if (rule.enabled && quantity > 0)
                nextHardware.push({ id: rule.id, supplierCode: rule.id, name: rule.name, category: rule.category as CompleteBOM['hardware'][number]['category'], quantity, positionSpec: 'Workshop requirement', installationNotes: [], alternatives: [], estimatedTime: 0, metadata: { unitPriceEgp: rule.unitPrice, currency: 'EGP', source: 'workshop_configuration', priceStatus: rule.unitPrice > 0 ? 'owner_supplied' : 'tbd' } });
        }
        else {
            nextAccessories = nextAccessories.filter(item => item.category !== rule.category);
            if (rule.enabled && quantity > 0)
                nextAccessories.push({ id: rule.id, name: rule.name, category: rule.category, quantity, unitPrice: rule.unitPrice, totalCost: quantity * rule.unitPrice, supplier: 'Workshop configuration', unit: rule.basis === 'perimeter' ? 'metre' : 'piece' });
        }
    }
    return { hardware: nextHardware, accessories: nextAccessories };
}
