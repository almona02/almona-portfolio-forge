/**
 * Spacing System
 * 
 * Enterprise-grade spacing system for consistent layout and visual grouping
 * across the Drafting Workbench.
 * 
 * Constitutional: Deterministic styling, no ML/AI
 * Tier: 3 Protected Determinism
 */

/**
 * Spacing scale (based on 4px base unit)
 */
export const SPACING_SCALE = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
} as const;

/**
 * Padding presets for common use cases
 */
export const PADDING_PRESETS = {
  // Component padding
  component: 'p-4',           // 16px - Standard component padding
  componentTight: 'p-2',       // 8px - Tight component padding
  componentLoose: 'p-6',       // 24px - Loose component padding
  
  // Panel padding
  panel: 'p-4',                // 16px - Standard panel padding
  panelHeader: 'px-4 py-3',    // Horizontal 16px, Vertical 12px
  panelContent: 'p-4',         // 16px - Panel content padding
  
  // Card padding
  card: 'p-4',                 // 16px - Standard card padding
  cardHeader: 'px-4 py-3',     // Horizontal 16px, Vertical 12px
  cardContent: 'p-4',          // 16px - Card content padding
  
  // Button padding
  button: 'px-4 py-2',         // Horizontal 16px, Vertical 8px
  buttonSmall: 'px-2 py-1',    // Horizontal 8px, Vertical 4px
  buttonLarge: 'px-6 py-3',    // Horizontal 24px, Vertical 12px
  
  // Input padding
  input: 'px-3 py-2',         // Horizontal 12px, Vertical 8px
  inputSmall: 'px-2 py-1',    // Horizontal 8px, Vertical 4px
  
  // Status bar padding
  statusBar: 'px-4 py-3',     // Horizontal 16px, Vertical 12px
  
  // Menu padding
  menu: 'p-2',                 // 8px - Menu padding
  menuItem: 'px-3 py-2',       // Horizontal 12px, Vertical 8px
} as const;

/**
 * Margin presets for common use cases
 */
export const MARGIN_PRESETS = {
  // Section spacing
  section: 'mb-6',             // 24px - Between major sections
  sectionSmall: 'mb-4',        // 16px - Between minor sections
  
  // Element spacing
  element: 'mb-4',             // 16px - Between elements
  elementTight: 'mb-2',       // 8px - Tight element spacing
  elementLoose: 'mb-6',       // 24px - Loose element spacing
  
  // Group spacing
  group: 'space-y-4',         // 16px vertical spacing between group items
  groupTight: 'space-y-2',    // 8px vertical spacing
  groupLoose: 'space-y-6',     // 24px vertical spacing
  
  // Horizontal spacing
  horizontal: 'space-x-4',    // 16px horizontal spacing
  horizontalTight: 'space-x-2', // 8px horizontal spacing
  horizontalLoose: 'space-x-6', // 24px horizontal spacing
} as const;

/**
 * Gap presets for flex/grid layouts
 */
export const GAP_PRESETS = {
  tight: 'gap-2',              // 8px
  normal: 'gap-4',             // 16px
  loose: 'gap-6',              // 24px
  xl: 'gap-8',                 // 32px
} as const;

/**
 * Get padding classes
 */
export function getPadding(preset: keyof typeof PADDING_PRESETS): string {
  return PADDING_PRESETS[preset];
}

/**
 * Get margin classes
 */
export function getMargin(preset: keyof typeof MARGIN_PRESETS): string {
  return MARGIN_PRESETS[preset];
}

/**
 * Get gap classes
 */
export function getGap(preset: keyof typeof GAP_PRESETS): string {
  return GAP_PRESETS[preset];
}


