/**
 * IPreviewPanel — Swappable Preview/Visualization Interface
 *
 * Any component that provides a visual preview of the window design
 * MUST satisfy this interface to be plugged into EngineeringBay.
 *
 * Current implementors:
 *   - Enhanced3DPreview     (dual-output: 3D + production data — default)
 *   - Window3DGenerator     (pure 3D view, no production panel)
 *
 * Future implementors:
 *   - GCodePreview          (raw G-code visualization for Operator View)
 *   - SVGSchematicPreview   (lightweight 2D schematic for low-power devices)
 *   - ARPreview             (augmented reality overlay — mobile)
 *
 * @since Phase 1 — Swappable Core (2026-02-08)
 */

import type { WindowUnit } from '@/types/fabricator';

/**
 * Minimum props every preview panel must accept.
 */
export interface IPreviewPanelProps {
  /** The window unit being previewed */
  windowUnit: WindowUnit;
  /** Visualization mode: 'customer' for sales, 'operator' for factory floor */
  mode?: 'customer' | 'operator';
  /** Callback when validation results change (for parent status display) */
  onValidationChange?: (result: unknown) => void;
  /** Optional CSS class */
  className?: string;
}

/**
 * React component type for any preview panel.
 *
 * Usage in EngineeringBay:
 *   <PreviewComponent windowUnit={unit} mode="operator" />
 */
export type PreviewPanelComponent = React.ComponentType<IPreviewPanelProps>;
