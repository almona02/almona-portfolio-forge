/**
 * DraftingPreview3D - Deterministic 3D Preview Component
 *
 * When drafting has a defined frame (materialAwareWindows + grid), uses Window3DGenerator
 * (single source of truth for 3D). Otherwise falls back to DraftingCanvas3D for plain rectangles.
 */

import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import type { Profile } from '@/types/fabricator';
import { AlertCircle, Box } from 'lucide-react';
import React, { Suspense, lazy, useMemo } from 'react';
import { useDraftingContext } from './DraftingContext';
import { DraftingCanvas3D } from './canvas/DraftingCanvas3D';
import { DraftingErrorBoundary } from './components/DraftingErrorBoundary';
import { EmptyState } from './components/EmptyState';
import { LoadingState } from './components/LoadingState';
import type { MaterialType } from './types/materialAware';
import { draftingToWindowUnit } from './utils/draftingToWindowUnit';

const Window3DGenerator = lazy(() => import('../Window3DGenerator').then(m => ({ default: m.Window3DGenerator })));

export interface DraftingPreview3DProps {
  selectedMaterial?: MaterialType;
  selectedSystemPackId?: string;
  profiles?: Profile[];
  color?: string;
}

export const DraftingPreview3D: React.FC<DraftingPreview3DProps> = ({
  selectedSystemPackId = 'caluminium_ps_v3',
}) => {
  const drafting = useDraftingContext();
  const geometry = drafting.getGeometry();
  const windowUnit = useMemo(() => draftingToWindowUnit(drafting), [drafting]);

  const hasGeometry = geometry.rectangles.length > 0;
  // Use Window3DGenerator only when we have a grid with cells (sashes/mullions).
  // Single rectangle or single defined frame with no grid uses DraftingCanvas3D to avoid corrupted preview.
  const hasGridWithCells = (windowUnit?.grid?.cells?.length ?? 0) > 0;
  const useFullFidelity = windowUnit != null && hasGridWithCells;

  if (!hasGeometry) {
    return (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
        <EmptyState
          icon={Box}
          title="3D Preview"
          description="No geometry to display. Draw shapes in the 2D view to see a 3D preview here."
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
        <Suspense fallback={<LoadingState message="Loading 3D Engine..." size="lg" overlay />}>
          <Window3DGenerator windowUnit={windowUnit} showControls={false} />
        </Suspense>
      ) : (
        <DraftingCanvas3D
          rectangles={geometry.rectangles}
          systemId={selectedSystemPackId}
        />
      )}
    </DraftingErrorBoundary>
  );
};
