/**
 * Advanced engineering: certify patterns on an owned pack, set default,
 * and deep-link BOM requirements per pattern. Does not bypass cut-ledger identity.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EGYPTIAN_PATTERNS } from '@/data/egyptian-window-patterns';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { loadCustomSystemsFromSupabase } from '@/lib/fabricator/systemPackSupabase';
import { addCustomSystemAsync } from '@/lib/fabricator/customSystemStorage';
import {
  readPackPatternConfig,
  withPackPatternConfig,
  type PackPatternConfig,
} from '@/lib/fabricator/packPatternConfig';
import { getCertifiedPatternsForPack, getLayoutTemplatesForSystem } from '@/lib/fabricator/patternPackCompatibility';
import type { SystemPack } from '@/types/fabricator';
import { Button } from '@/shared/ui/ui/button';
import { toast } from 'sonner';

export function PackPatternAdvancedEditor({ packId, ownerId }: { packId: string; ownerId: string }) {
  const navigate = useNavigate();
  const [pack, setPack] = useState<SystemPack | null>(null);
  const [owned, setOwned] = useState(false);
  const [config, setConfig] = useState<PackPatternConfig>({ certifiedPatternIds: [], defaultPatternId: null });
  const [addPatternId, setAddPatternId] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPack(null);
    void loadCustomSystemsFromSupabase(ownerId).then((packs) => {
      if (cancelled) return;
      const mine = packs.find((p) => p.meta.id === packId);
      const source = mine ?? SYSTEM_PACKS.find((p) => p.meta.id === packId) ?? null;
      setOwned(Boolean(mine));
      setPack(source);
      if (source) {
        try {
          setConfig(readPackPatternConfig(source));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Invalid pack pattern config');
          setConfig({ certifiedPatternIds: [], defaultPatternId: null });
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [packId, ownerId]);

  const catalogueCertified = useMemo(
    () => (pack ? getCertifiedPatternsForPack(pack.meta.id).map((p) => p.id) : []),
    [pack],
  );
  const templates = useMemo(
    () => (pack ? getLayoutTemplatesForSystem(pack.meta.id) : EGYPTIAN_PATTERNS),
    [pack],
  );
  const addable = useMemo(() => {
    const certified = new Set([...catalogueCertified, ...config.certifiedPatternIds]);
    return templates.filter((p) => !certified.has(p.id));
  }, [templates, catalogueCertified, config.certifiedPatternIds]);

  if (!pack) return null;

  const save = async () => {
    setSaving(true);
    try {
      const updated = withPackPatternConfig(pack, config);
      await addCustomSystemAsync(updated, ownerId);
      setPack(updated);
      setOwned(true);
      window.dispatchEvent(new Event('customProfileAdded'));
      toast.success('Pack pattern certification saved. Approvals and BOM remain separate gates.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save pack patterns');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="my-4 rounded border border-slate-600/60 bg-slate-950/60 p-4 space-y-3"
      data-testid="pack-pattern-advanced-editor"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <h3 className="text-slate-100 font-semibold">Advanced · patterns & default</h3>
          <p className="text-xs text-slate-400 mt-1">
            Certify layout patterns on this pack, pick one default, then scope workshop BOM components
            per pattern. Cut-ledger identity stays fail-closed.
          </p>
        </div>
        <span className="text-xs text-amber-300 shrink-0 ml-3">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="space-y-4 pt-2 border-t border-slate-700">
          {!owned ? (
            <Button
              disabled={saving}
              onClick={() => {
                void (async () => {
                  setSaving(true);
                  try {
                    const copy = {
                      ...pack,
                      meta: {
                        ...pack.meta,
                        id: `custom-pack-${crypto.randomUUID()}`,
                        name: `${pack.meta.name} workshop`,
                      },
                    };
                    await addCustomSystemAsync(copy, ownerId);
                    void navigate(
                      `/fabricator/studio/data/tuning?systemPackId=${encodeURIComponent(copy.meta.id)}`,
                    );
                  } catch {
                    toast.error('Unable to create owned workshop copy.');
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
            >
              Create an owned workshop copy to edit patterns
            </Button>
          ) : (
            <>
              <div className="text-xs text-slate-400 space-y-1">
                <p>
                  Catalogue-certified (read-only):{' '}
                  <span className="text-slate-200">
                    {catalogueCertified.length ? catalogueCertified.join(', ') : 'none'}
                  </span>
                </p>
                <p>
                  Pack-owned certified:{' '}
                  <span className="text-slate-200">
                    {config.certifiedPatternIds.length
                      ? config.certifiedPatternIds.join(', ')
                      : 'none yet'}
                  </span>
                </p>
              </div>

              <ul className="space-y-2">
                {config.certifiedPatternIds.map((id) => {
                  const pattern = EGYPTIAN_PATTERNS.find((p) => p.id === id);
                  return (
                    <li
                      key={id}
                      className="flex flex-wrap items-center gap-2 rounded border border-slate-700 px-3 py-2 text-sm"
                    >
                      <span className="text-amber-100 font-medium min-w-0 flex-1">
                        {pattern?.name ?? id}
                        <span className="block text-xs text-slate-500">{id}</span>
                      </span>
                      <label className="text-xs text-slate-300 flex items-center gap-1">
                        <input
                          type="radio"
                          name="default-pattern"
                          checked={config.defaultPatternId === id}
                          onChange={() => setConfig((c) => ({ ...c, defaultPatternId: id }))}
                        />
                        Default
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setConfig((c) => ({
                            certifiedPatternIds: c.certifiedPatternIds.filter((x) => x !== id),
                            defaultPatternId: c.defaultPatternId === id ? null : c.defaultPatternId,
                          }))
                        }
                      >
                        Remove
                      </Button>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="flex-1 text-xs text-slate-400 space-y-1">
                  Add pattern to pack
                  <select
                    className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-2 text-sm text-slate-100"
                    value={addPatternId}
                    onChange={(e) => setAddPatternId(e.target.value)}
                    aria-label="Pattern to certify on pack"
                  >
                    <option value="">Select a layout pattern…</option>
                    {addable.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  variant="outline"
                  disabled={!addPatternId}
                  onClick={() => {
                    if (!addPatternId) return;
                    setConfig((c) => ({
                      ...c,
                      certifiedPatternIds: [...c.certifiedPatternIds, addPatternId],
                      defaultPatternId: c.defaultPatternId ?? addPatternId,
                    }));
                    setAddPatternId('');
                  }}
                >
                  Add pattern
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button disabled={saving} onClick={() => void save()}>
                  Save pattern certification
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setConfig((c) => ({ ...c, defaultPatternId: null }))
                  }
                >
                  Clear default
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Scope BOM components per pattern in Workshop BOM requirements below (pattern scope
                field). Regenerating the BOM and manufacturing approvals remain separate steps.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
