/**
 * Typography System
 * 
 * Enterprise-grade typography system for consistent visual hierarchy
 * across the Drafting Workbench.
 * 
 * Constitutional: Deterministic styling, no ML/AI
 * Tier: 3 Protected Determinism
 */

/**
 * Typography scale for consistent font sizing
 */
export const TYPOGRAPHY_SCALE = {
  xs: 'text-xs',      // 12px - Labels, captions, metadata
  sm: 'text-sm',      // 14px - Secondary text, descriptions
  base: 'text-base',  // 16px - Body text, default
  lg: 'text-lg',      // 18px - Subheadings, emphasized text
  xl: 'text-xl',      // 20px - Section headings
  '2xl': 'text-2xl',  // 24px - Page titles
  '3xl': 'text-3xl',  // 30px - Major headings
} as const;

/**
 * Font weight scale
 */
export const FONT_WEIGHTS = {
  light: 'font-light',      // 300
  normal: 'font-normal',    // 400
  medium: 'font-medium',    // 500
  semibold: 'font-semibold', // 600
  bold: 'font-bold',        // 700
} as const;

/**
 * Line height scale
 */
export const LINE_HEIGHTS = {
  tight: 'leading-tight',    // 1.25
  snug: 'leading-snug',      // 1.375
  normal: 'leading-normal',  // 1.5
  relaxed: 'leading-relaxed', // 1.625
  loose: 'leading-loose',    // 2
} as const;

/**
 * Typography presets for common use cases
 */
export const TYPOGRAPHY_PRESETS = {
  // Headings
  h1: `${TYPOGRAPHY_SCALE['3xl']} ${FONT_WEIGHTS.bold} ${LINE_HEIGHTS.tight}`,
  h2: `${TYPOGRAPHY_SCALE['2xl']} ${FONT_WEIGHTS.bold} ${LINE_HEIGHTS.tight}`,
  h3: `${TYPOGRAPHY_SCALE.xl} ${FONT_WEIGHTS.semibold} ${LINE_HEIGHTS.snug}`,
  h4: `${TYPOGRAPHY_SCALE.lg} ${FONT_WEIGHTS.semibold} ${LINE_HEIGHTS.snug}`,
  h5: `${TYPOGRAPHY_SCALE.base} ${FONT_WEIGHTS.medium} ${LINE_HEIGHTS.normal}`,
  h6: `${TYPOGRAPHY_SCALE.sm} ${FONT_WEIGHTS.medium} ${LINE_HEIGHTS.normal}`,
  
  // Body text
  body: `${TYPOGRAPHY_SCALE.base} ${FONT_WEIGHTS.normal} ${LINE_HEIGHTS.relaxed}`,
  bodySmall: `${TYPOGRAPHY_SCALE.sm} ${FONT_WEIGHTS.normal} ${LINE_HEIGHTS.relaxed}`,
  
  // UI elements
  label: `${TYPOGRAPHY_SCALE.sm} ${FONT_WEIGHTS.medium} ${LINE_HEIGHTS.normal}`,
  caption: `${TYPOGRAPHY_SCALE.xs} ${FONT_WEIGHTS.normal} ${LINE_HEIGHTS.normal}`,
  button: `${TYPOGRAPHY_SCALE.sm} ${FONT_WEIGHTS.medium} ${LINE_HEIGHTS.tight}`,
  input: `${TYPOGRAPHY_SCALE.base} ${FONT_WEIGHTS.normal} ${LINE_HEIGHTS.normal}`,
  
  // Status and metadata
  status: `${TYPOGRAPHY_SCALE.xs} ${FONT_WEIGHTS.normal} ${LINE_HEIGHTS.normal}`,
  metadata: `${TYPOGRAPHY_SCALE.xs} ${FONT_WEIGHTS.light} ${LINE_HEIGHTS.normal}`,
} as const;

/**
 * Get typography classes for a preset
 */
export function getTypographyPreset(preset: keyof typeof TYPOGRAPHY_PRESETS): string {
  return TYPOGRAPHY_PRESETS[preset];
}

/**
 * Typography utility for combining classes
 */
export function combineTypography(
  size?: keyof typeof TYPOGRAPHY_SCALE,
  weight?: keyof typeof FONT_WEIGHTS,
  lineHeight?: keyof typeof LINE_HEIGHTS
): string {
  const classes: string[] = [];
  
  if (size) classes.push(TYPOGRAPHY_SCALE[size]);
  if (weight) classes.push(FONT_WEIGHTS[weight]);
  if (lineHeight) classes.push(LINE_HEIGHTS[lineHeight]);
  
  return classes.join(' ');
}


