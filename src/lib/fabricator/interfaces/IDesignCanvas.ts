/**
 * IDesignCanvas — Swappable Design Surface Interface
 *
 * Any component that provides a visual grid editor for defining
 * window layout (sashes, fixed panels, mullions) MUST satisfy this
 * interface to be plugged into EngineeringBay.
 *
 * Current implementors:
 *   - SmartDrawCanvas   (grid-based visual editor — default)
 *   - DraftingCanvas2D  (CAD-style drafting canvas)
 *
 * Future implementors:
 *   - MobileSVGCanvas   (lightweight touch-first editor for iPad Sales Rep)
 *   - ReadOnlyPreview   (non-interactive snapshot for Production view)
 *
 * @since Phase 1 — Swappable Core (2026-02-08)
 */

import type { WindowGrid } from '@/types/fabricator';

/**
 * Minimum props every design canvas must accept.
 *
 * EngineeringBay passes these — anything beyond this is
 * implementation-specific and handled internally by the canvas.
 */
export interface IDesignCanvasProps {
  /** Current window grid state (controlled component) */
  grid: WindowGrid;
  /** Callback when the grid changes (controlled component) */
  onGridChange: (grid: WindowGrid) => void;
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** If true, the canvas is non-interactive (view-only) */
  readOnly?: boolean;
  /** Optional CSS class */
  className?: string;
  /** Optional system pack context (affects profile suggestions) */
  systemPackId?: string | null;
}

/**
 * React component type for any design canvas.
 *
 * Usage in EngineeringBay:
 *   <CanvasComponent grid={grid} onGridChange={setGrid} width={800} height={600} />
 */
export type DesignCanvasComponent = React.ComponentType<IDesignCanvasProps>;
