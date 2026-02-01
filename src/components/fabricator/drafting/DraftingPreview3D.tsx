/**
 * DraftingPreview3D - Deterministic 3D Preview Component
 * 
 * Replaced "Gold-Tier" generator with explicit, deterministic Three.js implementation
 * to ensure "No AI Hype" accuracy.
 * 
 * Features:
 * - Renders 2D rectangles as 3D extruded aluminum frames
 * - Uses real profile dimensions from ProfileRegistry
 * - Deterministic, no "hallucinations"
 */

import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import type { Profile } from '@/types/fabricator';
import { AlertCircle, Box } from 'lucide-react';
import React, { Suspense, lazy } from 'react';
import { useDraftingContext } from './DraftingContext';
import { DraftingErrorBoundary } from './components/DraftingErrorBoundary';
import { EmptyState } from './components/EmptyState';
import { LoadingState } from './components/LoadingState';
import type { MaterialType } from './types/materialAware';

// Lazy load the actual Canvas component
const DraftingCanvas3D = lazy(() => import('./canvas/DraftingCanvas3D').then(m => ({ default: m.DraftingCanvas3D })));

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

  // Check if we have anything to render
  const hasGeometry = geometry.rectangles.length > 0;

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
      <Suspense fallback={<LoadingState message="Loading 3D Engine..." size="lg" overlay />}>
        <DraftingCanvas3D
          rectangles={geometry.rectangles}
          systemId={selectedSystemPackId}
        />
      </Suspense>
    </DraftingErrorBoundary>
  );
};
