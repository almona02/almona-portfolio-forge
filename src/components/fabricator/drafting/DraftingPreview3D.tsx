/**
 * DraftingPreview3D - Deterministic 3D Preview Component
 *
 * When drafting has a defined frame (materialAwareWindows + grid) or a saved
 * authoritative position with a grid, uses Window3DGenerator (single source of truth
 * for 3D). Otherwise falls back to DraftingCanvas3D for plain rectangles.
 *
 * The preview is a read model (AICS-001 Tier 0): explode / inspect never write to the
 * design, BOM or stock.
 */

import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import type { Profile, WindowUnit } from '@/types/fabricator';
import { AlertCircle, Box } from 'lucide-react';
import React, { Suspense, lazy, useMemo, useState } from 'react';
import { useDraftingContext } from './DraftingContext';
import { DraftingCanvas3D } from './canvas/DraftingCanvas3D';
import { DraftingErrorBoundary } from './components/DraftingErrorBoundary';
import { EmptyState } from './components/EmptyState';
import { LoadingState } from './components/LoadingState';
import type { MaterialType } from './types/materialAware';
import { draftingToWindowUnit, type PreviewLedgerBinding } from './utils/draftingToWindowUnit';

const Window3DGenerator = lazy(() => import('../Window3DGenerator').then(m => ({ default: m.Window3DGenerator })));

export interface DraftingPreview3DProps {
  selectedMaterial?: MaterialType;
  selectedSystemPackId?: string;
  profiles?: Profile[];
  color?: string;
  /** Saved position the drafting is editing; supplies identity, finish and the saved part ledger. */
  authoritativeUnit?: WindowUnit | null;
}

const BINDING_LABEL: Record<PreviewLedgerBinding, string> = {
  bound: 'Saved part list bound',
  design_edited: 'Design edited since last save — part codes hidden until saved',
  no_saved_ledger: 'No saved part list for this revision yet',
  no_authority: 'Free drafting — no saved position',
};

export const DraftingPreview3D: React.FC<DraftingPreview3DProps> = ({
  selectedSystemPackId = 'caluminium_ps_v3',
  profiles = [],
  color,
  authoritativeUnit = null,
}) => {
  const [explodedView, setExplodedView] = useState(false);
  const drafting = useDraftingContext();
  const geometry = drafting.getGeometry();
  const windowUnit = useMemo(() => {
    const unit = draftingToWindowUnit(drafting, authoritativeUnit);
    if (!unit) return null;
    // An explicit saved finish wins over the generic drafting colour; a caller-supplied
    // colour is only a fallback for free drafting.
    const finish = unit.previewLedgerBinding === 'no_authority' ? (color ?? unit.color) : unit.color;
    return { ...unit, color: finish };
  }, [drafting, color, authoritativeUnit]);

  const hasGeometry = geometry.rectangles.length > 0;
  // Use Window3DGenerator only when we have a grid with cells (sashes/mullions).
  // Single rectangle or single defined frame with no grid uses DraftingCanvas3D to avoid corrupted preview.
  const hasGridWithCells = (windowUnit?.grid?.cells?.length ?? 0) > 0;
  const useFullFidelity = windowUnit != null && hasGridWithCells;

  if (!hasGeometry && !useFullFidelity) {
    return (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
        <EmptyState
          icon={Box}
          title="3D Preview"
          description={authoritativeUnit
            ? 'This saved position has no grid yet. Draw or define a frame in the 2D view to see a 3D preview.'
            : 'No geometry to display. Draw shapes in the 2D view to see a 3D preview here.'}
          size="md"
        />
      </div>
    );
  }

  return (
    <DraftingErrorBoundary
      level="component"
      fallback={
        <div className="w-full h-full flex items-center justify-center p-4 bg-slate-900">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>3D Preview Error</strong>
              <p className="mt-2 text-sm">Failed to load 3D renderer.</p>
            </AlertDescription>
          </Alert>
        </div>
      }
    >
      {useFullFidelity && windowUnit ? (
        <div className="relative w-full h-full">
          <Suspense fallback={<LoadingState message="Loading 3D Engine..." size="lg" overlay />}>
            <Window3DGenerator
              windowUnit={windowUnit}
              profiles={profiles}
              showControls
              explodedView={explodedView}
              setExplodedView={setExplodedView}
            />
          </Suspense>
          <dl
            aria-label="Preview source"
            className="pointer-events-none absolute bottom-4 right-4 z-10 grid max-w-xs grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded border border-slate-700 bg-slate-950/85 px-3 py-2 text-[11px] text-slate-300"
          >
            <dt className="text-slate-500">System</dt><dd>{windowUnit.systemPackId ?? 'Not set'}</dd>
            <dt className="text-slate-500">Finish</dt><dd>{windowUnit.color || 'Not set'}</dd>
            <dt className="text-slate-500">Size</dt><dd>{`${Math.round(windowUnit.overallWidth)} × ${Math.round(windowUnit.overallHeight)} mm`}</dd>
            {windowUnit.revision != null && <><dt className="text-slate-500">Revision</dt><dd>R{windowUnit.revision}</dd></>}
            <dt className="text-slate-500">Parts</dt><dd>{BINDING_LABEL[windowUnit.previewLedgerBinding]}</dd>
          </dl>
        </div>
      ) : (
        <DraftingCanvas3D
          rectangles={geometry.rectangles}
          systemId={selectedSystemPackId}
        />
      )}
    </DraftingErrorBoundary>
  );
};
