/**
 * Fabricator Component Interfaces — Barrel Export
 *
 * The "Swappable Core" contract. Import from here:
 *   import type { IDesignCanvasProps, IPreviewPanelProps } from '@/lib/fabricator/interfaces';
 *
 * @since Phase 1 — Swappable Core (2026-02-08)
 */

export type {
    DesignCanvasComponent,
    IDesignCanvasProps
} from './IDesignCanvas';

export type {
    IPreviewPanelProps,
    PreviewPanelComponent
} from './IPreviewPanel';

export type {
    CutListViewComponent,
    ICutListViewProps
} from './ICutListView';
