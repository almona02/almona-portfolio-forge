/**
 * System pack accessories / hardware kits configuration.
 * Reachable from Data Studio and Settings → Manufacturing.
 * Edits workshop unit_price overrides (admin override path for BOM).
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import { loadCustomSystems, type StoredSystemPack } from '@/lib/fabricator/customSystemStorage';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import {
  clearHardwareKitOverride,
  listKitsFromPackSpec,
  loadHardwareKitOverrides,
  mergeHardwareKitsWithOverrides,
  setHardwareKitOverride,
  type HardwareKitOverridesMap,
  type PackHardwareKitLike,
} from '@/lib/fabricator/manufacturing/hardwareKitOverrides';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select';
import { Package, RotateCcw, Save, Wrench } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

type PackOption = {
  id: string;
  name: string;
  kits: PackHardwareKitLike[];
};

function collectPacks(): PackOption[] {
  const map = new Map<string, PackOption>();
  const push = (pack: { meta?: { id?: string; name?: string }; windowSystemSpec?: Record<string, unknown> }) => {
    const id = pack.meta?.id;
    if (!id) return;
    const kits = listKitsFromPackSpec(pack.windowSystemSpec);
    map.set(id, {
      id,
      name: pack.meta?.name || id,
      kits,
    });
  };
  SYSTEM_PACKS.forEach((p) => push(p as PackOption & { meta: { id: string; name: string }; windowSystemSpec: Record<string, unknown> }));
  loadCustomSystems().forEach((p: StoredSystemPack) =>
    push(p as unknown as { meta?: { id?: string; name?: string }; windowSystemSpec?: Record<string, unknown> }),
  );
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function SystemPackAccessoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const packs = useMemo(() => collectPacks(), []);
  const packsWithKits = useMemo(() => packs.filter((p) => p.kits.length > 0), [packs]);
  const initialPack =
    searchParams.get('pack') ||
    packsWithKits.find((p) => p.id === 'caluminium-ps')?.id ||
    packsWithKits[0]?.id ||
    packs[0]?.id ||
    '';

  const [packId, setPackId] = useState(initialPack);
  const [overrides, setOverrides] = useState<HardwareKitOverridesMap>(() => loadHardwareKitOverrides());
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});

  const selected = packs.find((p) => p.id === packId) || packsWithKits[0] || packs[0];
  const mergedKits = useMemo(() => {
    if (!selected) return [];
    return mergeHardwareKitsWithOverrides(selected.id, selected.kits, overrides);
  }, [selected, overrides]);

  useEffect(() => {
    if (!selected) return;
    const next: Record<string, string> = {};
    for (const kit of mergedKits) {
      if (!kit.id) continue;
      next[kit.id] = String(kit.unit_price ?? '');
    }
    setDraftPrices(next);
  }, [selected?.id, overrides]); // eslint-disable-line react-hooks/exhaustive-deps -- reset drafts when pack/overrides change

  useEffect(() => {
    if (packId && searchParams.get('pack') !== packId) {
      setSearchParams({ pack: packId }, { replace: true });
    }
  }, [packId, searchParams, setSearchParams]);

  const saveKit = (kitId: string) => {
    const raw = draftPrices[kitId];
    const price = Number(raw);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Unit price must be a positive number (EGP)');
      return;
    }
    const map = setHardwareKitOverride(packId, kitId, { unit_price: price });
    setOverrides({ ...map });
    toast.success(`Saved override for ${kitId}`);
  };

  const resetKit = (kitId: string) => {
    const map = clearHardwareKitOverride(packId, kitId);
    setOverrides({ ...map });
    const catalogue = selected?.kits.find((k) => k.id === kitId);
    setDraftPrices((prev) => ({
      ...prev,
      [kitId]: String(catalogue?.unit_price ?? ''),
    }));
    toast.message(`Cleared override for ${kitId}`);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto" data-testid="system-pack-accessories-page">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-amber-200 flex items-center gap-2">
          <Wrench className="w-6 h-6" />
          System pack accessories
        </h1>
        <p className="text-sm text-slate-400">
          Configure hardware / accessories kits per profile system pack (rollers, handles, locks,
          corner keys). Positive unit prices become workshop admin overrides in manufacturing BOM.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            to={fabricatorRoutes.studioDataProfiles()}
            className="text-amber-400/90 hover:text-amber-300 underline-offset-2 hover:underline"
          >
            ← Profiles library
          </Link>
          <span className="text-slate-600">·</span>
          <Link
            to="/settings?tab=manufacturing"
            className="text-amber-400/90 hover:text-amber-300 underline-offset-2 hover:underline"
          >
            Settings → Manufacturing
          </Link>
        </div>
      </header>

      <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-4 space-y-3">
        <Label className="text-amber-100/90">System pack</Label>
        <Select value={packId} onValueChange={setPackId}>
          <SelectTrigger className="bg-slate-950/60 border-slate-700" data-testid="accessories-pack-select">
            <SelectValue placeholder="Select a system pack" />
          </SelectTrigger>
          <SelectContent>
            {packs.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {p.kits.length === 0 ? ' (no kits)' : ` (${p.kits.length} kits)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selected && (
          <p className="text-xs text-slate-500 font-mono">{selected.id}</p>
        )}
      </div>

      {!selected || mergedKits.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 p-10 text-center text-slate-500">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>No hardware_kits defined on this pack.</p>
          <p className="text-xs mt-2">Catalogue packs like CALUMINIUM PS include rollers, locks, and corner keys.</p>
        </div>
      ) : (
        <ul className="space-y-3" data-testid="accessories-kit-list">
          {mergedKits.map((kit) => {
            const id = kit.id || 'unknown';
            const hasOverride = Boolean(overrides[packId]?.[id]?.unit_price);
            const specs = kit.specifications || {};
            const leg = typeof specs.leg_mm === 'number' ? specs.leg_mm : undefined;
            const role = typeof specs.role === 'string' ? specs.role : undefined;
            return (
              <li
                key={id}
                className="rounded-lg border border-slate-700/50 bg-slate-950/40 p-4 space-y-3"
                data-testid={`accessories-kit-${id}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-amber-100">{kit.name || id}</div>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">{id}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {kit.type && (
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {String(kit.type)}
                      </Badge>
                    )}
                    {role && (
                      <Badge variant="outline" className="border-amber-700/50 text-amber-200/90">
                        {role}
                      </Badge>
                    )}
                    {leg != null && (
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {leg} mm leg
                      </Badge>
                    )}
                    {hasOverride && (
                      <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/40">
                        Override
                      </Badge>
                    )}
                    {kit.pricing_status === 'provisional' && !hasOverride && (
                      <Badge variant="outline" className="border-yellow-700/40 text-yellow-200/80">
                        Provisional
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1.5 min-w-[140px]">
                    <Label htmlFor={`price-${id}`} className="text-xs text-slate-400">
                      Unit price (EGP)
                    </Label>
                    <Input
                      id={`price-${id}`}
                      type="number"
                      min={0.01}
                      step={0.5}
                      value={draftPrices[id] ?? ''}
                      onChange={(e) =>
                        setDraftPrices((prev) => ({ ...prev, [id]: e.target.value }))
                      }
                      className="bg-slate-900 border-slate-700"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                    onClick={() => saveKit(id)}
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600"
                    disabled={!hasOverride}
                    onClick={() => resetKit(id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
