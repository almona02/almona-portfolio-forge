import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { loadCustomSystemsFromSupabase } from '@/lib/fabricator/systemPackSupabase';
import { addCustomSystemAsync } from '@/lib/fabricator/customSystemStorage';
import { workshopBOMRules, type WorkshopBOMRule } from '@/lib/fabricator/bom/workshopBOMRules';
import { canonicalJsonbSerialize, sha256Hex } from '@/lib/fabricator/commercial/validateOptimizationEvidencePayload';
import type { SystemPack } from '@/types/fabricator';
import { Input } from '@/shared/ui/ui/input';
import { Button } from '@/shared/ui/ui/button';
import { toast } from 'sonner';
export function WorkshopBOMRulesEditor({ packId, ownerId }: {
    packId: string;
    ownerId: string;
}) {
    const navigate = useNavigate();
    const [pack, setPack] = useState<SystemPack | null>(null), [owned, setOwned] = useState(false), [rules, setRules] = useState<WorkshopBOMRule[]>([]), [review, setReview] = useState(''), [saving, setSaving] = useState(false);
    useEffect(() => { let cancelled = false; setPack(null); setReview(''); void loadCustomSystemsFromSupabase(ownerId).then(packs => { if (cancelled)
        return; const mine = packs.find(p => p.meta.id === packId); const source = mine ?? SYSTEM_PACKS.find(p => p.meta.id === packId); setOwned(Boolean(mine)); setPack(source ?? null); if (source)
        setRules(workshopBOMRules(source)); }); return () => { cancelled = true; }; }, [packId, ownerId]);
    const update = (index: number, patch: Partial<WorkshopBOMRule>) => setRules(previous => previous.map((r, i) => i === index ? { ...r, ...patch } : r));
    if (!pack)
        return null;
    return <section className="my-4 rounded border border-amber-700/40 bg-slate-900 p-4 space-y-3">
  <h3 className="text-amber-200 font-semibold">Workshop BOM requirements</h3>
  <p className="text-xs text-slate-400">Set quantities for hinges, rollers, handles, gaskets or other components. Each configured category replaces its standard quantity. Hardware categories: hinge, lock, handle, roller, corner_key, gasket or hardener. Disable a category to omit it. Perimeter quantities use the overall window perimeter in metres. Saved configuration remains an estimate until reviewed.</p>
  {!owned ? <Button disabled={saving} onClick={async () => { setSaving(true); try {
            const copy = { ...pack, meta: { ...pack.meta, id: 'custom-pack-' + crypto.randomUUID(), name: pack.meta.name + ' workshop' } };
            await addCustomSystemAsync(copy, ownerId);
            navigate('/fabricator/studio/data/tuning?systemPackId=' + encodeURIComponent(copy.meta.id));
        }
        catch {
            toast.error('Unable to save workshop copy.');
        }
        finally {
            setSaving(false);
        } }}>Create an owned workshop copy</Button> : <>
   <div className="space-y-3">{rules.map((r, index) => <div key={r.id} className="grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-slate-700 pb-3">
    <Input aria-label={'Component name ' + index} value={r.name} onChange={e => update(index, { name: e.target.value })}/>
    <Input aria-label={'Component category ' + index} value={r.category} onChange={e => update(index, { category: e.target.value })}/>
    <select aria-label={'Component kind ' + index} value={r.kind} onChange={e => update(index, { kind: e.target.value as WorkshopBOMRule['kind'], category: e.target.value === 'hardware' ? 'hinge' : 'seal', basis: 'window' })}><option value="hardware">Hardware</option><option value="accessory">Accessory / gasket</option></select>
    <select aria-label={'Quantity basis ' + index} value={r.basis} onChange={e => update(index, { basis: e.target.value as WorkshopBOMRule['basis'] })}><option value="window">Per window</option><option value="sash">Per opening sash</option>{r.kind === 'accessory' && <option value="perimeter">Metres per overall perimeter</option>}</select>
    <Input aria-label={'Component quantity ' + index} type="number" min="0" value={r.quantity} onChange={e => update(index, { quantity: Number(e.target.value) })}/>
    <Input aria-label={'Component unit price ' + index} type="number" min="0" value={r.unitPrice} onChange={e => update(index, { unitPrice: Number(e.target.value) })}/>
    <label className="text-xs"><input type="checkbox" checked={r.enabled} onChange={e => update(index, { enabled: e.target.checked })}/> Included in BOM</label>
    <Button variant="outline" onClick={() => setRules(previous => previous.filter((_, i) => i !== index))}>Remove override</Button>
   </div>)}</div>
   <Button variant="outline" onClick={() => setRules(previous => [...previous, { id: 'workshop-' + crypto.randomUUID(), name: 'Gasket', kind: 'accessory', category: 'seal', basis: 'perimeter', quantity: 1, unitPrice: 0, enabled: true }])}>Add component requirement</Button>
   <Button disabled={saving} onClick={async () => { setSaving(true); try {
            const updated = { ...pack, windowSystemSpec: { ...pack.windowSystemSpec, workshop_bom_rules: rules } } as SystemPack;
            workshopBOMRules(updated);
            await addCustomSystemAsync(updated, ownerId);
            setPack(updated);
            setReview(await sha256Hex(canonicalJsonbSerialize(rules)));
            window.dispatchEvent(new Event('customProfileAdded'));
            toast.success('Workshop requirements saved. Regenerate the BOM; approval is separate.');
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to save requirements');
        }
        finally {
            setSaving(false);
        } }}>Save requirements</Button>
   {review && <details className="text-xs"><summary>Technical review reference</summary><p className="break-all">{review}</p><p>Include this value as workshopBomRulesFingerprint in the approved cutting rule applicability after reviewing this configuration.</p></details>}
  </>}
  <a className="text-xs underline text-amber-300" href="/fabricator/studio/approvals">Open catalogue, pattern and cutting-rule approvals</a>
 </section>;
}
