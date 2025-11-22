/**
 * Design Tools Library
 * Exports all design tool utilities
 */

export {
  calculateEqualSpacing,
  autoDistributeMullions,
  autoDistributeTransoms,
  validatePlacement,
  type MullionPlacement,
  type PlacementOptions,
} from './SmartMullionPlacer';

export {
  createWindowStyle,
  applyColorScheme,
  getMaterialColor,
  saveWindowStyle,
  getSavedWindowStyles,
  deleteWindowStyle,
  predefinedColorSchemes,
  predefinedFinishes,
  type ColorScheme,
  type Finish,
  type WindowStyle,
} from './VisualCustomizer';

