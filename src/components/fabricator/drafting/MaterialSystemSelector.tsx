// src/components/fabricator/drafting/MaterialSystemSelector.tsx

/**
 * Material & System Pack Selector
 * Allows selection of material (Aluminum/UPVC) and compatible system packs
 * Integrates with drafting tools for material-aware design
 */

import { Info, Layers } from 'lucide-react';
import React, { useMemo } from 'react';
import { ProfileRegistry } from './services/ProfileRegistry';
import type { MaterialType } from './types/materialAware';

interface MaterialSystemSelectorProps {
  selectedMaterial: MaterialType;
  selectedSystemPackId?: string;
  onMaterialChange: (material: MaterialType) => void;
  onSystemPackChange: (systemPackId: string) => void;
}

export const MaterialSystemSelector: React.FC<MaterialSystemSelectorProps> = ({
  selectedMaterial,
  selectedSystemPackId,
  onMaterialChange,
  onSystemPackChange
}) => {
  // Use ProfileRegistry to get systems
  const compatibleSystemPacks = useMemo(() => {
    const allSystems = ProfileRegistry.getInstance().getAllSystems();

    return allSystems.filter(sys => {
      // Logic to filter by material type (Aluminum vs UPVC based on ID/Name convention or explicit type if added)
      // For now, based on ID convention in Phase 1 registry mock:
      // Aluminum: alumil_*, ps_*
      // UPVC: upvc_*, wintech_*

      const isUpvc = sys.id.includes('upvc') || sys.id.includes('wintech') || sys.id.includes('kompen');

      return selectedMaterial === 'upvc' ? isUpvc : !isUpvc;
    });
  }, [selectedMaterial]);

  const effectiveSystemPack = useMemo(
    () => selectedSystemPackId ?? compatibleSystemPacks[0]?.id ?? '',
    [selectedSystemPackId, compatibleSystemPacks],
  );
  const selectedPackIsRegistered = compatibleSystemPacks.some(
    (pack) => pack.id === effectiveSystemPack,
  );

  // Never substitute another system's specifications for an authoritative pack.
  const materialSpec = useMemo(
    () => selectedPackIsRegistered
      ? ProfileRegistry.getInstance().getSpecs(effectiveSystemPack)
      : undefined,
    [effectiveSystemPack, selectedPackIsRegistered],
  );

  return (
    <div className="space-y-3">
      <div>
        <h3 className="typography-h3 mb-2 flex items-center gap-2 text-foreground">
          <Layers size={16} />
          Material & System Pack
        </h3>

        {/* Material Selection */}
        <div className="mb-3">
          <label className="typography-label text-sm text-muted-foreground block mb-2">
            Material Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => onMaterialChange('aluminum')}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${selectedMaterial === 'aluminum'
                ? 'bg-blue-600 text-white'
                : 'bg-card text-foreground hover:bg-muted'
                }`}
            >
              Aluminum
            </button>
            <button
              onClick={() => onMaterialChange('upvc')}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${selectedMaterial === 'upvc'
                ? 'bg-blue-600 text-white'
                : 'bg-card text-foreground hover:bg-muted'
                }`}
            >
              UPVC
            </button>
          </div>
        </div>

        {/* System Pack Selection */}
        <div>
          <label className="typography-label text-sm text-muted-foreground block mb-2">
            System Pack
          </label>
          <select
            value={effectiveSystemPack}
            onChange={(e) => onSystemPackChange(e.target.value)}
            className="w-full border border-border bg-background rounded px-2 py-1 text-sm text-foreground focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            {!selectedPackIsRegistered && effectiveSystemPack && (
              <option value={effectiveSystemPack} className="bg-background text-warning">
                {effectiveSystemPack === 'rock60' ? 'ROCK 60' : effectiveSystemPack} (specifications unavailable)
              </option>
            )}
            {compatibleSystemPacks.map(pack => (
              <option key={pack.id} value={pack.id} className="bg-background text-foreground">
                {pack.name} ({pack.manufacturer})
              </option>
            ))}
          </select>
        </div>

        {/* Material Specifications */}
        {materialSpec && (
          <div className="mt-3 p-3 bg-blue-500/10 rounded border border-blue-500/20">
            <div className="flex items-start gap-2 mb-2">
              <Info size={14} className="text-info mt-0.5" />
              <div className="flex-1 text-xs text-info space-y-1">
                <div className="flex justify-between">
                  <span className="text-info/80">Profile Depth:</span>
                  <span className="font-medium">{materialSpec.profileDepth}mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-info/80">Glazing Pocket:</span>
                  <span className="font-medium">
                    {materialSpec.glazingPocket.depth}×{materialSpec.glazingPocket.width}mm
                  </span>
                </div>
                {materialSpec.thermalBreak && (
                  <div className="flex justify-between">
                    <span className="text-info/80">Thermal Break:</span>
                    <span className="font-medium">{materialSpec.thermalBreak.width}mm</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-info/80">Max Span:</span>
                  <span className="font-medium">{materialSpec.maxSpanWithoutMullion}mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-info/80">Corner Connection:</span>
                  <span className="font-medium">
                    {materialSpec.cornerConnection === 'miter' ? '45° Miter' :
                      materialSpec.cornerConnection === 'welded' ? 'Welded (3mm)' :
                        'Corner Key'}
                  </span>
                </div>
                {materialSpec.requiresReinforcementAbove && (
                  <div className="flex justify-between">
                    <span className="text-info/80">Reinforcement:</span>
                    <span className="font-medium">
                      Required above {materialSpec.requiresReinforcementAbove}mm
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

