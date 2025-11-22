export { GLBViewer } from './GLBViewer'
export { ModelTest } from './ModelTest'
export { EnhancedGLBViewer } from './EnhancedGLBViewer'
export { OptimizedGLBViewer } from './OptimizedGLBViewer'
export { UniversalARViewer } from './UniversalARViewer'
export { Model3DDialog } from './Model3DDialog'

// New enhanced 3D viewers with Window3DGenerator integration
export { Enhanced3DViewer } from './Enhanced3DViewer'
export { Interactive3DViewer } from './Interactive3DViewer'
export { Optimized3DViewer } from './Optimized3DViewer'

// Export types
export type { WindowPartAnnotation } from './Interactive3DViewer'

// Lazy-loaded components for better performance
export { 
  LazyEnhancedGLBViewer, 
  LazyOptimizedGLBViewer, 
  LazyUniversalARViewer 
} from './LazyGLBViewer'
