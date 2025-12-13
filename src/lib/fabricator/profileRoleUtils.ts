/**
 * Profile Role Utilities
 * Gold-tier granular role definitions and grouping for accurate cutting lists
 */

import type { Profile } from '@/types/fabricator';

export type ProfileRole = Profile['profileRole'];

/**
 * Comprehensive role definitions with display names and categories
 */
export const PROFILE_ROLES: Array<{
  value: NonNullable<ProfileRole>;
  label: string;
  category: 'frame' | 'sash' | 'structural' | 'glazing' | 'accessory';
  description?: string;
}> = [
  // Frame Roles
  { value: 'frame', label: 'Frame (Main)', category: 'frame', description: 'Main frame profile' },
  { value: 'frame_architrave', label: 'Frame with Architrave', category: 'frame', description: 'Frame with decorative architrave border' },
  { value: 'architrave', label: 'Architrave (Standalone)', category: 'frame', description: 'Standalone architrave profile' },
  { value: 'threshold', label: 'Threshold', category: 'frame', description: 'Bottom threshold profile' },
  { value: 'sill', label: 'Sill', category: 'frame', description: 'Window sill profile' },
  { value: 'head', label: 'Head', category: 'frame', description: 'Top head profile' },
  { value: 'jamb', label: 'Jamb', category: 'frame', description: 'Side jamb profile' },
  
  // Sash Roles
  { value: 'sash', label: 'Sash (Standard)', category: 'sash', description: 'Standard operable sash' },
  { value: 'sash_sliding', label: 'Sliding Sash', category: 'sash', description: 'Sliding sash profile' },
  { value: 'sash_door', label: 'Door Sash', category: 'sash', description: 'Door sash profile' },
  { value: 'sash_flyscreen', label: 'Fly-screen Sash', category: 'sash', description: 'Fly-screen sash profile' },
  { value: 'sash_casement', label: 'Casement Sash', category: 'sash', description: 'Casement sash profile' },
  { value: 'screen_sash', label: 'Screen Sash', category: 'sash', description: 'Screen sash profile' },
  
  // Structural Roles
  { value: 'mullion', label: 'Mullion (True)', category: 'structural', description: 'Vertical divider - true mullion' },
  { value: 'mullion_false', label: 'False Mullion', category: 'structural', description: 'Decorative false mullion' },
  { value: 'transom', label: 'Transom', category: 'structural', description: 'Horizontal divider' },
  { value: 'reinforcement', label: 'Reinforcement', category: 'structural', description: 'Reinforcement profile' },
  { value: 'corner_cleat', label: 'Corner Cleat', category: 'structural', description: 'Corner cleat profile' },
  
  // Glazing Roles
  { value: 'glazing_bead', label: 'Glazing Bead (Standard)', category: 'glazing', description: 'Standard glazing bead' },
  { value: 'glazing_bead_inner', label: 'Glazing Bead (Inner)', category: 'glazing', description: 'Inner glazing bead' },
  { value: 'glazing_bead_outer', label: 'Glazing Bead (Outer)', category: 'glazing', description: 'Outer glazing bead' },
  
  // Accessory Roles
  { value: 'interlock', label: 'Interlock', category: 'accessory', description: 'Interlock profile' },
  { value: 'accessory', label: 'Accessory Profile', category: 'accessory', description: 'General accessory profile' },
  { value: 'screen_adapter', label: 'Screen Adapter (Barour Shabaak)', category: 'accessory', description: 'Screen adapter profile' },
  { value: 'panel', label: 'Panel / Filler', category: 'accessory', description: 'Panel or filler profile' },
  { value: 'gasket', label: 'Gasket', category: 'accessory', description: 'Gasket profile' },
  { value: 'weather_strip', label: 'Weather Strip', category: 'accessory', description: 'Weather strip profile' },
];

/**
 * Get role display name
 */
export function getRoleLabel(role: ProfileRole | undefined): string {
  if (!role) return 'Frame';
  const roleDef = PROFILE_ROLES.find(r => r.value === role);
  return roleDef?.label || role;
}

/**
 * Get role category
 */
export function getRoleCategory(role: ProfileRole | undefined): 'frame' | 'sash' | 'structural' | 'glazing' | 'accessory' {
  if (!role) return 'frame';
  const roleDef = PROFILE_ROLES.find(r => r.value === role);
  return roleDef?.category || 'frame';
}

/**
 * Group cuts by role category for cutting list display
 */
export function groupCutsByRole(cuts: Array<{ componentType?: string }>): {
  frame: typeof cuts;
  sash: typeof cuts;
  structural: typeof cuts;
  glazing: typeof cuts;
  accessory: typeof cuts;
  other: typeof cuts;
} {
  const groups = {
    frame: [] as typeof cuts,
    sash: [] as typeof cuts,
    structural: [] as typeof cuts,
    glazing: [] as typeof cuts,
    accessory: [] as typeof cuts,
    other: [] as typeof cuts,
  };

  cuts.forEach(cut => {
    const role = cut.componentType as ProfileRole | undefined;
    const category = getRoleCategory(role);
    
    if (category in groups) {
      groups[category].push(cut);
    } else {
      groups.other.push(cut);
    }
  });

  return groups;
}

/**
 * Get role options grouped by category for select dropdowns
 */
export function getRoleOptionsByCategory() {
  const categories = {
    frame: PROFILE_ROLES.filter(r => r.category === 'frame'),
    sash: PROFILE_ROLES.filter(r => r.category === 'sash'),
    structural: PROFILE_ROLES.filter(r => r.category === 'structural'),
    glazing: PROFILE_ROLES.filter(r => r.category === 'glazing'),
    accessory: PROFILE_ROLES.filter(r => r.category === 'accessory'),
  };
  return categories;
}

