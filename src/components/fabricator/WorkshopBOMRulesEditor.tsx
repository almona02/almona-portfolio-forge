import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EGYPTIAN_PATTERNS } from '@/data/egyptian-window-patterns';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { loadCustomSystemsFromSupabase } from '@/lib/fabricator/systemPackSupabase';
import { addCustomSystemAsync } from '@/lib/fabricator/customSystemStorage';
import { workshopBOMRules, type WorkshopBOMRule } from '@/lib/fabricator/bom/workshopBOMRules';
import { readPackPatternConfig } from '@/lib/fabricator/packPatternConfig';
import { getCertifiedPatternsForPack } from '@/lib/fabricator/patternPackCompatibility';
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
    const patternOptions = useMemo(() => {
        if (!pack) return EGYPTIAN_PATTERNS;
        const ownedIds = (() => {
            try { return readPackPatternConfig(pack).certifiedPatternIds; } catch { return []; }
        })();
        const certified = new Set([
            ...getCertifiedPatternsForPack(pack.meta.id).map((p) => p.id),
            ...ownedIds,
        ]);
        const preferred = EGYPTIAN_PATTERNS.filter((p) => certified.has(p.id));
        return preferred.length ? preferred : EGYPTIAN_PATTERNS;
    }, [pack]);
    if (!pack)
        return null;
    return <section className="my-4 rounded border border-amber-700/40 bg-background p-4 space-y-3">
  <h3 className="text-warning font-semibold">Workshop BOM requirements</h3>
  <p className="text-xs text-muted-foreground">Set quantities for hinges, rollers, handles, gaskets or other components. Each configured category replaces its standard quantity. Hardware categories: hinge, lock, handle, roller, corner_key, gasket or hardener. Disable a category to omit it. Perimeter quantities use the overall window perimeter in metres. Advanced: scope a requirement to one or more patterns (pose preset). Saved configuration remains an estimate until reviewed.</p>
  {!owned ? <Button disabled={saving} onClick={() => { void (async () => { setSaving(true); try {
            const copy = { ...pack, meta: { ...pack.meta, id: 'custom-pack-' + crypto.randomUUID(), name: pack.meta.name + ' workshop' } };
            await addCustomSystemAsync(copy, ownerId);
            void navigate('/fabricator/studio/data/tuning?systemPackId=' + encodeURIComponent(copy.meta.id));
        }
        catch {
            toast.error('Unable to save workshop copy.');
        }
        finally {
            setSaving(false);
        } })(); }}>Create an owned workshop copy</Button> : <>
   <div className="space-y-3">{rules.map((r, index) => <div key={r.id} className="grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-border pb-3">
    <Input aria-label={'Component name ' + index} value={r.name} onChange={e => update(index, { name: e.target.value })}/>
    <Input aria-label={'Component category ' + index} value={r.category} onChange={e => update(index, { category: e.target.value })}/>
    <select aria-label={'Component kind ' + index} value={r.kind} onChange={e => update(index, { kind: e.target.value as WorkshopBOMRule['kind'], category: e.target.value === 'hardware' ? 'hinge' : 'seal', basis: 'window' })}><option value="hardware">Hardware</option><option value="accessory">Accessory / gasket</option></select>
    <select aria-label={'Quantity basis ' + index} value={r.basis} onChange={e => update(index, { basis: e.target.value as WorkshopBOMRule['basis'] })}><option value="window">Per window</option><option value="sash">Per opening sash</option>{r.kind === 'accessory' && <option value="perimeter">Metres per overall perimeter</option>}</select>
    <Input aria-label={'Component quantity ' + index} type="number" min="0" value={r.quantity} onChange={e => update(index, { quantity: Number(e.target.value) })}/>
    <Input aria-label={'Component unit price ' + index} type="number" min="0" value={r.unitPrice} onChange={e => update(index, { unitPrice: Number(e.target.value) })}/>
    <label className="text-xs col-span-2 md:col-span-4 space-y-1">
      <span className="text-muted-foreground">Pattern scope (advanced — empty = all patterns)</span>
      <select
        multiple
        className="w-full min-h-[4.5rem] rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
        aria-label={'Pattern scope ' + index}
        value={r.patternIds ?? []}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
          update(index, { patternIds: selected.length ? selected : undefined });
        }}
      >
        {patternOptions.map((p) => (
          <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
        ))}
      </select>
    </label>
    <label className="text-xs"><input type="checkbox" checked={r.enabled} onChange={e => update(index, { enabled: e.target.checked })}/> Included in BOM</label>
    <Button variant="outline" onClick={() => setRules(previous => previous.filter((_, i) => i !== index))}>Remove override</Button>
   </div>)}</div>
   <Button variant="outline" onClick={() => setRules(previous => [...previous, { id: 'workshop-' + crypto.randomUUID(), name: 'Gasket', kind: 'accessory', category: 'seal', basis: 'perimeter', quantity: 1, unitPrice: 0, enabled: true }])}>Add component requirement</Button>
   <Button disabled={saving} onClick={() => { void (async () => { setSaving(true); try {
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
        } })(); }}>Save requirements</Button>
   {review && <details className="text-xs"><summary>Technical review reference</summary><p className="break-all">{review}</p><p>Include this value as workshopBomRulesFingerprint in the approved cutting rule applicability after reviewing this configuration.</p></details>}
  </>}
  <a className="text-xs underline text-warning" href="/fabricator/studio/approvals">Open catalogue, pattern and cutting-rule approvals</a>
 </section>;
}
