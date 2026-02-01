// src/components/fabricator/drafting/utils/materialSpecs.ts

/**
 * Material Specifications Database
 * Defines material-specific properties for aluminum and UPVC systems
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import type { MaterialSpec } from '../types/materialAware';

/**
 * Get material specification for a system pack
 */
export function getMaterialSpec(systemPackId: string): MaterialSpec | null {
  const systemPack = SYSTEM_PACKS.find(p => p.meta.id === systemPackId);
  if (!systemPack) return null;

  const material = systemPackId.toLowerCase().includes('upvc') || 
                  systemPackId.toLowerCase().includes('wintech') ||
                  systemPackId.toLowerCase().includes('kompen') ||
                  systemPackId.toLowerCase().includes('emapen') ||
                  systemPackId.toLowerCase().includes('foxywin')
    ? 'upvc' : 'aluminum';

  // Extract profile depth from system pack
  const profiles = systemPack.profiles || [];
  const frameProfile = profiles.find(p => p.profileRole === 'frame');
  const profileDepth = frameProfile?.width || 60; // Default 60mm

  // Get glazing pocket from system pack specs
  const _windowSystemSpec = systemPack.windowSystemSpec || {};
  const glassAllowances = systemPack.glassAllowances;
  
  const glazingPocket = {
    depth: glassAllowances?.edgeClearanceMm ? glassAllowances.edgeClearanceMm * 2 + 4 : 20,
    width: glassAllowances?.edgeClearanceMm ? glassAllowances.edgeClearanceMm * 2 + 4 : 20,
    clearance: glassAllowances?.edgeClearanceMm || 4
  };

  // Material-specific defaults
  if (material === 'aluminum') {
    return {
      material: 'aluminum',
      systemPackId,
      profileDepth,
      glazingPocket,
      thermalBreak: {
        width: 20, // mm
        material: 'polyamide'
      },
      maxSpanWithoutMullion: 3000, // mm
      requiresReinforcementAbove: 2000, // mm
      cornerConnection: 'miter'
    };
  } else {
    // UPVC
    return {
      material: 'upvc',
      systemPackId,
      profileDepth,
      glazingPocket: {
        ...glazingPocket,
        depth: Math.max(glazingPocket.depth, 24), // UPVC typically deeper
        width: Math.max(glazingPocket.width, 24)
      },
      maxSpanWithoutMullion: 2400, // mm
      requiresReinforcementAbove: 1800, // mm
      cornerConnection: 'welded',
      weldingBurnOff: 3 // mm
    };
  }
}

/**
 * Get default material spec for a material type
 */
export function getDefaultMaterialSpec(material: 'aluminum' | 'upvc'): MaterialSpec {
  if (material === 'aluminum') {
    return {
      material: 'aluminum',
      systemPackId: 'caluminium_ps_v3',
      profileDepth: 60,
      glazingPocket: {
        depth: 20,
        width: 20,
        clearance: 4
      },
      thermalBreak: {
        width: 20,
        material: 'polyamide'
      },
      maxSpanWithoutMullion: 3000,
      requiresReinforcementAbove: 2000,
      cornerConnection: 'miter'
    };
  } else {
    return {
      material: 'upvc',
      systemPackId: 'wintech_6400_detailed',
      profileDepth: 60,
      glazingPocket: {
        depth: 24,
        width: 24,
        clearance: 4
      },
      maxSpanWithoutMullion: 2400,
      requiresReinforcementAbove: 1800,
      cornerConnection: 'welded',
      weldingBurnOff: 3
    };
  }
}

/**
 * Check if span requires reinforcement
 */
export function requiresReinforcement(
  span: number,
  material: 'aluminum' | 'upvc'
): boolean {
  const spec = getDefaultMaterialSpec(material);
  return span > spec.requiresReinforcementAbove;
}

/**
 * Calculate required mullion spacing
 */
export function calculateMullionSpacing(
  totalWidth: number,
  material: 'aluminum' | 'upvc',
  mullionWidth: number = 50
): number {
  const spec = getDefaultMaterialSpec(material);
  const maxSpan = spec.maxSpanWithoutMullion;
  
  // Calculate how many mullions needed
  const mullionCount = Math.ceil((totalWidth - mullionWidth) / maxSpan);
  
  if (mullionCount === 0) return 0;
  
  // Calculate spacing
  const totalMullionWidth = mullionCount * mullionWidth;
  const availableWidth = totalWidth - totalMullionWidth;
  return availableWidth / (mullionCount + 1);
}

