// src/components/fabricator/drafting/tools/MaterialAwareWindowTool.tsx

/**
 * Material-Aware Window Tool
 * Creates windows with material-specific properties (aluminum or UPVC)
 * Automatically applies system pack constraints and specifications
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import { Layers } from 'lucide-react';
import React, { useState } from 'react';
import type { MaterialAwareRectangle, MaterialType } from '../types/materialAware';
import { getDefaultMaterialSpec, getMaterialSpec } from '../utils/materialSpecs';

interface MaterialAwareWindowToolProps {
  material: MaterialType;
  systemPackId?: string;
  onCreate?: (window: MaterialAwareRectangle) => void;
}

export const MaterialAwareWindowTool: React.FC<MaterialAwareWindowToolProps> = ({
  material,
  systemPackId,
  onCreate: _onCreate
}) => {
  const [selectedSystemPack, setSelectedSystemPack] = useState<string>(
    systemPackId || (material === 'aluminum' ? 'caluminium_ps_v3' : 'wintech_6400_detailed')
  );

  const availableSystemPacks = SYSTEM_PACKS.filter(pack => {
    const packId = pack.meta.id.toLowerCase();
    if (material === 'upvc') {
      return packId.includes('upvc') || 
             packId.includes('wintech') ||
             packId.includes('kompen') ||
             packId.includes('emapen') ||
             packId.includes('foxywin');
    } else {
      return !packId.includes('upvc') && 
             !packId.includes('wintech') &&
             !packId.includes('kompen') &&
             !packId.includes('emapen') &&
             !packId.includes('foxywin');
    }
  });

  const materialSpec = getMaterialSpec(selectedSystemPack) || getDefaultMaterialSpec(material === 'wood' ? 'aluminum' : material);

  // TODO: Implement window creation functionality when tool is integrated
  // const createWindow = useCallback((rect: { x: number; y: number; width: number; height: number }) => {
  //   // Validate against material constraints
  //   const width = Math.max(
  //     materialSpec.constraints?.minWidth || 600,
  //     Math.min(rect.width, materialSpec.constraints?.maxWidth || 3000)
  //   );
  //   const height = Math.max(
  //     materialSpec.constraints?.minHeight || 600,
  //     Math.min(rect.height, materialSpec.constraints?.maxHeight || 2600)
  //   );
  //
  //   const area = (width * height) / 1_000_000; // m²
  //   if (materialSpec.constraints?.maxArea && area > materialSpec.constraints.maxArea) {
  //     console.warn(`Window area ${area.toFixed(2)}m² exceeds maximum ${materialSpec.constraints.maxArea}m²`);
  //   }
  //
  //   const window: MaterialAwareRectangle = {
  //     ...rect,
  //     x: rect.x,
  //     y: rect.y,
  //     width,
  //     height,
  //     material,
  //     systemPackId: selectedSystemPack,
  //     profileDepth: materialSpec.profileDepth,
  //     glazingPocket: materialSpec.glazingPocket,
  //     thermalBreak: materialSpec.thermalBreak,
  //     constraints: {
  //       minWidth: materialSpec.constraints?.minWidth || 600,
  //       maxWidth: materialSpec.constraints?.maxWidth || 3000,
  //       minHeight: materialSpec.constraints?.minHeight || 600,
  //       maxHeight: materialSpec.constraints?.maxHeight || 2600,
  //       maxArea: materialSpec.constraints?.maxArea
  //     },
  //     type: 'fixed', // Default, can be changed
  //     id: `window-${material}-${Date.now()}`
  //   };
  //
  //   onCreate?.(window);
  // }, [material, selectedSystemPack, materialSpec, onCreate]);

  return (
    <div className="space-y-3 p-3 bg-amber-50 rounded border border-amber-200">
      <div className="flex items-center gap-2">
        <Layers size={16} className="text-amber-600" />
        <span className="text-sm font-medium text-amber-800">
          {material === 'aluminum' ? 'Aluminum' : 'UPVC'} Window Tool
        </span>
      </div>
      
      <div className="space-y-2">
        <div>
          <label className="text-xs font-medium text-amber-700 block mb-1">
            System Pack
          </label>
          <select
            value={selectedSystemPack}
            onChange={(e) => setSelectedSystemPack(e.target.value)}
            className="w-full text-xs border border-amber-300 rounded px-2 py-1 bg-white"
          >
            {availableSystemPacks.map(pack => (
              <option key={pack.meta.id} value={pack.meta.id}>
                {pack.meta.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-amber-700 space-y-1">
          <div className="flex justify-between">
            <span>Profile Depth:</span>
            <span className="font-medium">{materialSpec.profileDepth}mm</span>
          </div>
          <div className="flex justify-between">
            <span>Glazing Pocket:</span>
            <span className="font-medium">
              {materialSpec.glazingPocket.depth}×{materialSpec.glazingPocket.width}mm
            </span>
          </div>
          {materialSpec.thermalBreak && (
            <div className="flex justify-between">
              <span>Thermal Break:</span>
              <span className="font-medium">{materialSpec.thermalBreak.width}mm</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Max Span:</span>
            <span className="font-medium">{materialSpec.maxSpanWithoutMullion}mm</span>
          </div>
          <div className="flex justify-between">
            <span>Corner:</span>
            <span className="font-medium">
              {materialSpec.cornerConnection === 'miter' ? '45° Miter' : 
               materialSpec.cornerConnection === 'welded' ? 'Welded' : 
               'Corner Key'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

