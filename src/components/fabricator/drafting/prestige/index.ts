// src/components/fabricator/drafting/prestige/index.ts
/**
 * Prestige UX Components Export
 * 
 * Constitutional: All components include audit logging
 * Rule-based: No ML, deterministic recommendations only
 * Dual Market: Works for both local workshops AND enterprise clients
 */

export { MaterialGallery } from './MaterialGallery';
export type { MaterialOption } from './MaterialGallery';

export { SystemAuthorityCard } from './SystemAuthorityCard';
export type { SystemAuthority } from './SystemAuthorityCard';

export { PresetIntelligencePanel } from './PresetIntelligencePanel';
export type { PresetIntelligence } from './PresetIntelligencePanel';

export { ArchitecturalIntelligencePresets } from './ArchitecturalIntelligencePresets';
export type { ArchitecturalIntelligence } from './ArchitecturalIntelligencePresets';

export { 
  ARCHITECTURAL_PRESETS,
  recommendArchitecturalPreset,
  getPresetsForMarket
} from './architecturalPresetsData';

// Simple toggle approach (recommended)
export { ArchitecturalPresetSelector } from './ArchitecturalPresetSelector';
export type { ArchitecturalPreset } from './ArchitecturalPresetSelector';

export { 
  SIMPLE_PRESETS,
  recommendPreset
} from './simplePresetsData';

export {
  applyPresetIntelligence,
  getPresetById
} from './presetApplication';
export type { PresetApplicationResult } from './presetApplication';

