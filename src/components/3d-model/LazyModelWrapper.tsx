import { Button } from '@/shared/ui/ui/button';
import { lazyRetry } from '@/utils/lazyImport';
import { Box, Loader2 } from 'lucide-react';
import React, { Suspense, useState } from 'react';

// Lazy load the actual heavy viewer
const AdvancedModelViewer = lazyRetry(
  () => import('@/pages/AdvancedModelViewer').then(m => ({ default: m.AdvancedModelViewer })),
  'AdvancedModelViewer'
);

const LazyEnhancedGLBViewer = lazyRetry(
  () => import('@/components/3d-model/EnhancedGLBViewer').then(m => ({ default: m.EnhancedGLBViewer })),
  'LazyEnhancedGLBViewer'
);

const InteractiveGLBViewer = lazyRetry(
  () => import('@/components/3d-model/InteractiveGLBViewer').then(m => ({ default: m.InteractiveGLBViewer })),
  'InteractiveGLBViewer'
);

interface LazyModelWrapperProps {
  modelPath?: string;
  viewerType?: 'advanced' | 'glb' | 'interactive';
  height?: string;
  onLoaded?: () => void;
  autoLoad?: boolean;
  [key: string]: any; // Allow other props to pass through
}

/**
 * LazyModelWrapper - Loads 3D viewers only when user clicks "Load 3D Model"
 * This prevents loading ~1.5MB of Three.js code until needed
 * 
 * @example
 * <LazyModelWrapper modelPath="/models/machine.glb" viewerType="glb" />
 */
export const LazyModelWrapper: React.FC<LazyModelWrapperProps> = ({
  modelPath = '/models/demo-machine.glb',
  viewerType = 'glb',
  height = '400px',
  onLoaded,
  autoLoad = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(autoLoad);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoaded?.();
  };

  if (!isLoaded) {
    return (
      <div 
        className="w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700"
        style={{ height }}
      >
        <div className="text-center p-8 max-w-md">
          <div className="mb-4 flex justify-center">
            <Box className="w-12 h-12 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            3D Visualization
          </h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Click to load the 3D model viewer
          </p>
          <Button 
            onClick={handleLoad} 
            variant="default"
            className="mb-2"
          >
            Load 3D Model
          </Button>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            ~1.5MB 3D engine will load on demand
          </p>
        </div>
      </div>
    );
  }

  const ViewerComponent = viewerType === 'advanced' 
    ? AdvancedModelViewer 
    : viewerType === 'interactive'
    ? InteractiveGLBViewer
    : LazyEnhancedGLBViewer;

  return (
    <div style={{ height, width: '100%' }} className="relative">
      <Suspense 
        fallback={
          <div className="h-full w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Loading 3D engine...
              </p>
            </div>
          </div>
        }
      >
        <ViewerComponent 
          modelPath={modelPath}
          {...props}
        />
      </Suspense>
    </div>
  );
};

