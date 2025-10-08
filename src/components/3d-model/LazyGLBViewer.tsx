import React, { Suspense, lazy } from 'react';
import { Model3DLoading } from '@/components/ui/loading/Model3DLoading';

// Lazy load the heavy 3D components
const EnhancedGLBViewer = lazy(() => import('./EnhancedGLBViewer'));
const OptimizedGLBViewer = lazy(() => import('./OptimizedGLBViewer'));
const UniversalARViewer = lazy(() => import('./UniversalARViewer'));

// Loading fallback component
const ModelLoadingFallback: React.FC<{ message?: string; variant?: 'default' | 'minimal' | 'detailed' }> = ({ 
  message = "Loading 3D model...",
  variant = 'default'
}) => (
  <Model3DLoading
    className="h-full w-full"
    aspectRatio="square"
    showIcon={true}
    message={message}
    variant={variant}
  />
);

// Error boundary for 3D components
class ModelErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D Model Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-full bg-gray-900 text-white">
          <div className="text-center">
            <p className="text-sm text-red-400">Failed to load 3D model</p>
            <p className="text-xs text-gray-500 mt-1">
              {this.state.error?.message || 'Unknown error occurred'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Props interfaces
export interface LazyEnhancedGLBViewerProps {
  modelPath: string;
  usdzPath?: string;
  enableAR?: boolean;
  backgroundColor?: string;
  onLoaded?: () => void;
  title?: string;
  enableWebXR?: boolean;
  webXRHitTest?: boolean;
  autoPlayAnimations?: boolean;
  webXRScaleFactor?: number;
}

export interface LazyOptimizedGLBViewerProps {
  modelPath: string;
  backgroundColor?: string;
  onLoaded?: () => void;
  enableAR?: boolean;
  autoPlay?: boolean;
  quality?: 'low' | 'medium' | 'high';
}

export interface LazyUniversalARViewerProps {
  src: string;
  iosSrc?: string;
  poster?: string;
  alt?: string;
  ar?: boolean;
  autoRotate?: boolean;
  cameraControls?: boolean;
  exposure?: number;
  shadowIntensity?: number;
  style?: React.CSSProperties;
  className?: string;
}

// Lazy wrapper components
export const LazyEnhancedGLBViewer: React.FC<LazyEnhancedGLBViewerProps> = (props) => (
  <ModelErrorBoundary>
    <Suspense fallback={<ModelLoadingFallback message="Loading enhanced 3D viewer..." variant="detailed" />}>
      <EnhancedGLBViewer {...props} />
    </Suspense>
  </ModelErrorBoundary>
);

export const LazyOptimizedGLBViewer: React.FC<LazyOptimizedGLBViewerProps> = (props) => (
  <ModelErrorBoundary>
    <Suspense fallback={<ModelLoadingFallback message="Loading optimized 3D viewer..." variant="default" />}>
      <OptimizedGLBViewer {...props} />
    </Suspense>
  </ModelErrorBoundary>
);

export const LazyUniversalARViewer: React.FC<LazyUniversalARViewerProps> = (props) => (
  <ModelErrorBoundary>
    <Suspense fallback={<ModelLoadingFallback message="Loading AR viewer..." variant="minimal" />}>
      <UniversalARViewer {...props} />
    </Suspense>
  </ModelErrorBoundary>
);

// Default export for backward compatibility
export default LazyEnhancedGLBViewer;
