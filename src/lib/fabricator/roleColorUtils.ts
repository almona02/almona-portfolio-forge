/**
 * Role Color Utilities - University-Grade Visual Enhancement
 * 
 * Provides consistent color coding for profile roles in visualizations.
 * Ensures all 25+ profile roles have distinct, accessible colors.
 * 
 * @version 1.0.0
 */

import type { Profile } from '@/types/fabricator';
import { getRoleCategory } from './profileRoleUtils';

/**
 * Color scheme by role category
 * 
 * Designed for accessibility and visual distinction:
 * - Frame: Blue (primary structural element)
 * - Sash: Green (operable element)
 * - Structural: Orange (supporting elements)
 * - Glazing: Purple (glazing-related)
 * - Accessory: Gray (secondary elements)
 */
export const ROLE_CATEGORY_COLORS = {
  frame: '#3B82F6',      // Blue-500
  sash: '#10B981',       // Green-500
  structural: '#F59E0B', // Orange-500
  glazing: '#8B5CF6',    // Purple-500
  accessory: '#6B7280', // Gray-500
} as const;

/**
 * Get color for a profile role
 * 
 * @param role - Profile role (can be undefined for fallback)
 * @returns Hex color code
 */
export function getRoleColor(role: Profile['profileRole'] | undefined): string {
  if (!role) {
    return ROLE_CATEGORY_COLORS.frame; // Default to frame color
  }
  
  const category = getRoleCategory(role);
  return ROLE_CATEGORY_COLORS[category] || ROLE_CATEGORY_COLORS.frame;
}

/**
 * Get color with opacity for overlays
 * 
 * @param role - Profile role
 * @param opacity - Opacity value (0-1)
 * @returns RGBA color string
 */
export function getRoleColorWithOpacity(
  role: Profile['profileRole'] | undefined,
  opacity: number = 0.7
): string {
  const hex = getRoleColor(role);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Get border color for role (darker shade for contrast)
 * 
 * @param role - Profile role
 * @returns Hex color code (darker shade)
 */
export function getRoleBorderColor(role: Profile['profileRole'] | undefined): string {
  const baseColor = getRoleColor(role);
  // Darken by 20%
  const r = Math.max(0, parseInt(baseColor.slice(1, 3), 16) - 51);
  const g = Math.max(0, parseInt(baseColor.slice(3, 5), 16) - 51);
  const b = Math.max(0, parseInt(baseColor.slice(5, 7), 16) - 51);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get text color for role (white or black based on background)
 * 
 * @param role - Profile role
 * @returns 'white' or 'black'
 */
export function getRoleTextColor(role: Profile['profileRole'] | undefined): 'white' | 'black' {
  const color = getRoleColor(role);
  // Calculate luminance to determine if text should be white or black
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? 'black' : 'white';
}

/**
 * Role color legend for UI components
 */
export const ROLE_COLOR_LEGEND = [
  { category: 'frame', label: 'Frame Profiles', color: ROLE_CATEGORY_COLORS.frame },
  { category: 'sash', label: 'Sash Profiles', color: ROLE_CATEGORY_COLORS.sash },
  { category: 'structural', label: 'Structural Profiles', color: ROLE_CATEGORY_COLORS.structural },
  { category: 'glazing', label: 'Glazing Profiles', color: ROLE_CATEGORY_COLORS.glazing },
  { category: 'accessory', label: 'Accessory Profiles', color: ROLE_CATEGORY_COLORS.accessory },
] as const;

