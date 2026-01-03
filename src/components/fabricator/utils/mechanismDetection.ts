/**
 * Opening Mechanism Detection
 * 
 * Determines the opening mechanism type for a window cell with clear priority order.
 * Constitutional: Pure deterministic logic, no ML/AI.
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import type { EgyptianPattern } from '@/lib/fabricator/presetUtils';
import type { GridCell, WindowUnit } from '@/types/fabricator';

export type OpeningMechanism = 'casement' | 'sliding' | 'fixed';

/**
 * Detect opening mechanism with clear priority order:
 * 1. Pattern (most reliable for preset patterns)
 * 2. System Pack (from profile definitions)
 * 3. Cell type (user canvas selection)
 * 4. WindowUnit type (fallback)
 * 
 * @param windowUnit - The window unit
 * @param cell - The grid cell (optional)
 * @param pattern - The Egyptian pattern (optional)
 * @param systemPackId - System pack ID (optional)
 * @returns Detected opening mechanism type
 */
export function detectOpeningMechanism(
  windowUnit: WindowUnit,
  cell?: GridCell | null,
  pattern?: EgyptianPattern | null,
  systemPackId?: string | null
): OpeningMechanism {
  // Priority 1: Pattern (most reliable for preset patterns)
  if (pattern?.openingMechanism?.type) {
    const patternType = pattern.openingMechanism.type;
    if (patternType === 'sliding' || patternType === 'casement' || patternType === 'fixed') {
      return patternType;
    }
  }
  
  // Priority 2: System Pack (from profile definitions)
  if (systemPackId || windowUnit.systemPackId) {
    const packId = systemPackId || windowUnit.systemPackId;
    const systemPack = SYSTEM_PACKS.find(p => p.meta.id === packId);
    
    if (systemPack?.windowSystemSpec?.aluminum_profiles) {
      const frameProfile = systemPack.windowSystemSpec.aluminum_profiles.find(
        (p: any) => p.role === 'frame'
      );
      if (frameProfile?.system_type) {
        const systemType = frameProfile.system_type.toLowerCase();
        if (systemType === 'sliding' || systemType === 'casement') {
          return systemType;
        }
      }
    }
  }
  
  // Priority 3: Cell type (user canvas selection)
  if (cell) {
    if (cell.type === 'sliding') return 'sliding';
    if (cell.type === 'sash') return 'casement';
    if (cell.type === 'fixed' || cell.type === 'panel') return 'fixed';
  }
  
  // Priority 4: WindowUnit type (fallback)
  const windowType = (windowUnit.type || '').toLowerCase();
  if (windowType.includes('sliding')) return 'sliding';
  if (windowType.includes('casement')) return 'casement';
  if (windowType.includes('fixed')) return 'fixed';
  
  // Default: casement (safest assumption for most windows)
  return 'casement';
}

