import { SYSTEM_PACKS } from '@/data/systemPacks';
import { loadCustomSystemsFromSupabase } from '@/lib/fabricator/systemPackSupabase';
import { fingerprintBom } from '@/lib/fabricator/positionRelease';
import { useEffect, useState } from 'react';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { WindowUnit } from '@/types/fabricator';
import { buildPurchaseOrderLines, purchaseOrderCsv, type PurchaseOrderLine } from '@/lib/fabricator/inventory/purchaseOrderDraft';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { toast } from 'sonner';
export function PurchaseOrderDraftPanel({ bom, pose, ownerId, revision }: {
    bom: CompleteBOM;
    pose: WindowUnit;
    ownerId: string;
    revision: number;
}) {
    const [open, setOpen] = useState(false), [lines, setLines] = useState<PurchaseOrderLine[]>([]), [supplier, setSupplier] = useState(''), [query, setQuery] = useState('');
    const [stockLength, setStockLength] = useState(6000), [kerf, setKerf] = useState(3), [catalogue, setCatalogue] = useState<PurchaseOrderLine[]>([]);
    const sourceFingerprint = fingerprintBom(bom);
    const reference = 'PO-' + (pose.projectCode || pose.id.slice(0, 8)) + '-R' + revision;
    const key = 'workshop-purchase-order:' + ownerId + ':' + pose.id + ':' + revision;
    useEffect(() => { let cancelled = false; void loadCustomSystemsFromSupabase(ownerId).then(custom => { if (cancelled)
        return; const rows: PurchaseOrderLine[] = []; for (const pack of [...SYSTEM_PACKS, ...custom]) {
        const kits = (pack.windowSystemSpec as unknown as Record<string, unknown>)?.hardware_kits;
        if (!Array.isArray(kits))
            continue;
        for (const kit of kits) {
            if (!kit?.id || !kit?.name)
                continue;
            rows.push({ code: pack.meta.id + ':' + kit.id, name: pack.meta.name + ' · ' + kit.name, category: 'accessory', quantity: 1, unit: kit.type === 'gasket' ? 'metre' : 'piece', unitPrice: Number(kit.unit_price) || 0 });
        }
    } setCatalogue(rows); }); return () => { cancelled = true; }; }, [ownerId]);
    useEffect(() => { setOpen(false); setLines([]); setSupplier(''); }, [bom, pose.id, pose.quantity, revision, ownerId]);
    const update = (i: number, field: 'quantity' | 'unitPrice', value: number) => setLines(previous => previous.map((line, index) => index === i ? { ...line, [field]: value } : line));
    return <section className="my-3 rounded border border-amber-700/40 p-3">
  <Button onClick={() => { try {
        const saved = localStorage.getItem(key);
        if (saved) {
            const draft = JSON.parse(saved);
            if (draft.bomFingerprint === sourceFingerprint && Array.isArray(draft.lines) && typeof draft.supplier === 'string' && Number.isFinite(draft.stockLength) && draft.stockLength > 0 && Number.isFinite(draft.kerf) && draft.kerf >= 0 && draft.lines.every((line: PurchaseOrderLine) => line && typeof line.code === 'string' && typeof line.name === 'string' && typeof line.category === 'string' && ['bar', 'piece', 'metre'].includes(line.unit) && Number.isFinite(line.quantity) && line.quantity > 0 && Number.isFinite(line.unitPrice) && line.unitPrice >= 0)) {
                setLines(draft.lines);
                setSupplier(draft.supplier);
                setStockLength(draft.stockLength);
                setKerf(draft.kerf);
            }
            else
                setLines(buildPurchaseOrderLines(bom, pose, stockLength, kerf));
        }
        else
            setLines(buildPurchaseOrderLines(bom, pose, stockLength, kerf));
        setOpen(true);
    }
    catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to build purchase draft');
    } }}>Create purchase order from active BOM</Button>
  {open && <div className="mt-3 space-y-3">
   <p className="text-xs text-amber-200">{reference} · quantity {pose.quantity ?? 1}. Gross demand before stock allocation. Proposed bars are {stockLength} mm with {kerf} mm kerf; confirm with the supplier. This draft does not receive stock.</p>
   <div className="flex flex-wrap gap-2"><label>Stock length mm<Input aria-label="Proposed order stock length" type="number" value={stockLength} onChange={e => setStockLength(Number(e.target.value))}/></label><label>Kerf mm<Input aria-label="Proposed order kerf" type="number" value={kerf} onChange={e => setKerf(Number(e.target.value))}/></label><Button variant="outline" onClick={() => { try {
            setLines(buildPurchaseOrderLines(bom, pose, stockLength, kerf));
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Invalid stock proposal');
        } }}>Rebuild proposed quantities</Button></div>
   <Input aria-label="Purchase order supplier" placeholder="Supplier" value={supplier} onChange={e => setSupplier(e.target.value)}/>
   <Input aria-label="Search purchase order items" placeholder="Search profiles, accessories, name or code" value={query} onChange={e => setQuery(e.target.value)}/>
   <details><summary className="text-xs">Search accessory catalogue</summary>{catalogue.filter(item => (item.name + ' ' + item.code).toLowerCase().includes(query.toLowerCase())).slice(0, 30).map(item => <Button key={item.code} variant="outline" className="m-1 text-xs" onClick={() => setLines(previous => { const existing = previous.findIndex(line => line.code === item.code); return existing < 0 ? [...previous, { ...item }] : previous.map((line, index) => index === existing ? { ...line, quantity: line.quantity + 1 } : line); })}>Add {item.name}</Button>)}</details>
   <div className="overflow-auto"><table className="w-full text-xs"><thead><tr><th>Item</th><th>Category / unit</th><th>Quantity</th><th>Unit price EGP</th></tr></thead><tbody>{lines.map((line, index) => !((line.name + ' ' + line.code + ' ' + line.category).toLowerCase().includes(query.toLowerCase())) ? null : <tr key={line.category + ':' + line.code + ':' + index}><td>{line.name}<br />{line.code}</td><td>{line.category} · {line.unit}</td><td><Input aria-label={'Order quantity ' + line.code} type="number" min="0" value={line.quantity} onChange={e => update(index, 'quantity', Number(e.target.value))}/></td><td><Input aria-label={'Order price ' + line.code} type="number" min="0" value={line.unitPrice} onChange={e => update(index, 'unitPrice', Number(e.target.value))}/></td></tr>)}</tbody></table></div>
   <Button onClick={() => { try {
            const csv = purchaseOrderCsv(lines, supplier, reference);
            localStorage.setItem(key, JSON.stringify({ lines, supplier, revision, bomFingerprint: sourceFingerprint, stockLength, kerf }));
            const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = reference + '.csv';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Invalid purchase draft');
        } }}>Save draft & export purchase order</Button>
   <p className="text-xs text-slate-400">Includes profile bars, hardware and accessories. Confirm units and supplier prices; receive delivered profiles through the purchase wizard to establish owned catalogue mappings.</p>
  </div>}
 </section>;
}
