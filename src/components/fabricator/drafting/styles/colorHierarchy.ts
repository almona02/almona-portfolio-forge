/**
 * Color Hierarchy System
 * 
 * Enterprise-grade color system for consistent visual hierarchy
 * and information prioritization across the Drafting Workbench.
 * 
 * Constitutional: Deterministic styling, no advisory inference
 * Tier: 3 Protected Determinism
 */

/**
 * Primary color palette (Amber/Gold theme)
 */
export const PRIMARY_COLORS = {
  // Primary actions and highlights
  primary: {
    main: 'text-amber-400',      // Main primary color
    light: 'text-amber-300',     // Lighter variant
    dark: 'text-amber-500',      // Darker variant
    bg: 'bg-amber-500',          // Background
    bgLight: 'bg-amber-500/10',  // Light background
    bgDark: 'bg-amber-600/20',   // Dark background
    border: 'border-amber-500',  // Border
    borderLight: 'border-amber-500/30', // Light border
  },
  
  // Secondary actions
  secondary: {
    main: 'text-foreground',      // Main secondary color
    light: 'text-foreground',     // Lighter variant
    dark: 'text-muted-foreground',      // Darker variant
    bg: 'bg-muted',          // Background
    bgLight: 'bg-card/50',  // Light background
    border: 'border-border',  // Border
    borderLight: 'border-border/30', // Light border
  },
  
  // Tertiary/informational
  tertiary: {
    main: 'text-muted-foreground',      // Main tertiary color
    light: 'text-muted-foreground',     // Lighter variant
    dark: 'text-foreground',      // Darker variant
    bg: 'bg-card',          // Background
    bgLight: 'bg-background/50',  // Light background
    border: 'border-border',   // Border
  },
} as const;

/**
 * Semantic color palette (status, feedback)
 */
export const SEMANTIC_COLORS = {
  // Success states
  success: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-400',
  },
  
  // Error states
  error: {
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
  },
  
  // Warning states
  warning: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
  },
  
  // Info states
  info: {
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
  },
} as const;

/**
 * Information hierarchy colors
 */
export const HIERARCHY_COLORS = {
  // Critical information (highest priority)
  critical: {
    text: 'text-amber-300',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/40',
    weight: 'font-semibold',
  },
  
  // Important information
  important: {
    text: 'text-foreground',
    bg: 'bg-card/50',
    border: 'border-border/30',
    weight: 'font-medium',
  },
  
  // Standard information
  standard: {
    text: 'text-foreground',
    bg: 'bg-background/50',
    border: 'border-border/30',
    weight: 'font-normal',
  },
  
  // Secondary information
  secondary: {
    text: 'text-muted-foreground',
    bg: 'bg-background/30',
    border: 'border-border/20',
    weight: 'font-normal',
  },
  
  // Tertiary information (lowest priority)
  tertiary: {
    text: 'text-muted-foreground',
    bg: 'bg-background/50',
    border: 'border-border/10',
    weight: 'font-light',
  },
} as const;

/**
 * Get color classes for a hierarchy level
 */
export function getHierarchyColor(level: keyof typeof HIERARCHY_COLORS): {
  text: string;
  bg: string;
  border: string;
  weight: string;
} {
  return HIERARCHY_COLORS[level];
}

/**
 * Get semantic color classes
 */
export function getSemanticColor(type: keyof typeof SEMANTIC_COLORS): {
  text: string;
  bg: string;
  border: string;
  icon: string;
} {
  return SEMANTIC_COLORS[type];
}

/**
 * Get primary color classes
 */
export function getPrimaryColor(_variant: 'main' | 'light' | 'dark' = 'main'): typeof PRIMARY_COLORS.primary {
  return PRIMARY_COLORS.primary;
}


