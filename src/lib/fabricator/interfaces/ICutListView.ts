/**
 * ICutListView — Swappable Cut List Visualization Interface
 *
 * Any component that displays cut optimization results MUST satisfy
 * this interface to be plugged into the production panel.
 *
 * Current implementors:
 *   - CutListViewer         (standard bar/waste visualization — default)
 *   - AlmonaCutListViewer   (ALMONA-branded header + CutListViewer)
 *   - VisualCuttingPlan     (SVG bar layout diagram)
 *
 * Future implementors:
 *   - CompactCutList        (mobile-optimized condensed list)
 *   - MachineNativeCutList  (format matching the Yilmaz controller display)
 *
 * @since Phase 1 — Swappable Core (2026-02-08)
 */

import type { OptimizedCutList } from '@/lib/fabricator/UPVCCuttingEngine';

/**
 * Minimum props every cut list view must accept.
 */
export interface ICutListViewProps {
  /** The optimized cut list data */
  cutList: OptimizedCutList;
  /** Stock bar length in mm (default 6000) */
  barLengthMm?: number;
  /** Whether to display remnant pieces */
  showRemnants?: boolean;
  /** Project context for headers and labels */
  projectInfo?: {
    name: string;
    width: number;
    height: number;
    systemPack: string;
    orderNumber?: string;
    projectCode?: string;
  };
  /** Callback when user requests an export */
  onExport?: (format: 'csv' | 'pdf' | 'mdb') => void;
  /** Optional CSS class */
  className?: string;
}

/**
 * React component type for any cut list view.
 *
 * Usage:
 *   <CutListComponent cutList={optimized} projectInfo={info} onExport={handleExport} />
 */
export type CutListViewComponent = React.ComponentType<ICutListViewProps>;
