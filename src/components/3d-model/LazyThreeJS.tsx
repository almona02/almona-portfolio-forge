import React, { Suspense, lazy, useState, useEffect } from 'react';
import { PageLoadingWrapper } from '@/components/ui/PageLoadingWrapper';

// Lazy load Three.js components only when needed
const ThreeJSComponents = lazy(() => 
  import('@/lib/three-optimized').then(module => ({
    default: module
  }))
);

interface LazyThreeJSProps {
  children: (threeJS: any) => React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyThreeJS: React.FC<LazyThreeJSProps> = ({ 
  children, 
  fallback = (
    <PageLoadingWrapper 
      message="Loading 3D engine..." 
      variant="fullscreen"
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="text-sm text-gray-400">Initializing WebGL...</p>
      </div>
    </PageLoadingWrapper>
  )
}) => {
  const [threeJS, setThreeJS] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Preload Three.js when component mounts
    const loadThreeJS = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Add a small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const module = await import('@/lib/three-optimized');
        setThreeJS(module);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load Three.js:', err);
        setError('Failed to load 3D engine. Please refresh the page.');
        setIsLoading(false);
      }
    };

    loadThreeJS();
  }, []);

  if (error) {
    return (
      <PageLoadingWrapper 
        message={error}
        variant="fullscreen"
      >
        <div className="text-center">
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </PageLoadingWrapper>
    );
  }

  if (isLoading || !threeJS) {
    return <>{fallback}</>;
  }

  return (
    <Suspense fallback={fallback}>
      {children(threeJS)}
    </Suspense>
  );
};

export default LazyThreeJS;
