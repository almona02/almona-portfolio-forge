/**
 * Color Hierarchy System
 * 
 * Enterprise-grade color system for consistent visual hierarchy
 * and information prioritization across the Drafting Workbench.
 * 
 * Constitutional: Deterministic styling, no ML/AI
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
    main: 'text-slate-300',      // Main secondary color
    light: 'text-slate-200',     // Lighter variant
    dark: 'text-slate-400',      // Darker variant
    bg: 'bg-slate-700',          // Background
    bgLight: 'bg-slate-800/50',  // Light background
    border: 'border-slate-600',  // Border
    borderLight: 'border-slate-600/30', // Light border
  },
  
  // Tertiary/informational
  tertiary: {
    main: 'text-slate-400',      // Main tertiary color
    light: 'text-slate-500',     // Lighter variant
    dark: 'text-slate-300',      // Darker variant
    bg: 'bg-slate-800',          // Background
    bgLight: 'bg-slate-900/50',  // Light background
    border: 'border-slate-700',   // Border
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
    text: 'text-slate-200',
    bg: 'bg-slate-800/50',
    border: 'border-slate-600/30',
    weight: 'font-medium',
  },
  
  // Standard information
  standard: {
    text: 'text-slate-300',
    bg: 'bg-slate-900/50',
    border: 'border-slate-700/30',
    weight: 'font-normal',
  },
  
  // Secondary information
  secondary: {
    text: 'text-slate-400',
    bg: 'bg-slate-900/30',
    border: 'border-slate-800/20',
    weight: 'font-normal',
  },
  
  // Tertiary information (lowest priority)
  tertiary: {
    text: 'text-slate-500',
    bg: 'bg-slate-950/50',
    border: 'border-slate-800/10',
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
export function getPrimaryColor(_variant: 'main' | 'light' | 'dark' = 'main'): {
  text: string;
  bg: string;
  bgLight: string;
  border: string;
  borderLight: string;
} {
  return PRIMARY_COLORS.primary;
}


