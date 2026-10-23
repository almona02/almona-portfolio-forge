/**
 * Optimized Three.js imports to reduce bundle size
 * This file provides tree-shakeable imports for Three.js components
 */

// Core Three.js - minimal essential imports
export { 
  // Core Three.js - minimal essential imports
  Vector3, 
  Matrix4, 
  Quaternion, 
  Euler, 
  Box3,
  Sphere,
  Raycaster,
  Mesh,
  Group,
  Scene,
  Camera,
  PerspectiveCamera,
  OrthographicCamera,
  WebGLRenderer,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshLambertMaterial,
  TextureLoader,
  LoadingManager,
  Color
} from 'three';

// Remove heavy exporters unless specifically needed
// export { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
// export { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
// export { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

// React Three Fiber - core only
export { 
  Canvas, 
  useFrame, 
  useThree, 
  extend
} from '@react-three/fiber';

// React Three Drei - essential components only (remove heavy post-processing)
export { 
  OrbitControls,
  useGLTF,
  useAnimations,
  Environment,
  Bounds
} from '@react-three/drei';

// Dynamic import post-processing only when needed
export const lazyPostProcessing = () => import('@react-three/postprocessing');
export const lazyDreiEffects = () => import('@react-three/drei');

// Runtime loaders for compressed assets
let dracoInitialized = false;
let ktx2Initialized = false;

/**
 * Initialize Draco and KTX2 decoders for GLTF at runtime.
 * Call once at app start or before first model load.
 */
export const initCompressedModelDecoders = async (basePath: string = '/'): Promise<void> => {
  if (typeof window === 'undefined') return;
  // Dynamically import to keep bundle lean
  const [THREE, { DRACOLoader }, { KTX2Loader }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/loaders/DRACOLoader.js'),
    import('three/examples/jsm/loaders/KTX2Loader.js')
  ]);

  const { useGLTF } = await import('@react-three/drei');

  // Draco
  if (!dracoInitialized) {
    try {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(basePath + 'draco/'); // expects decoder files under public/draco
      // drei's useGLTF exposes a global DRACOLoader setter via 'preload' side-effects in runtime
      // setDRACOLoader is an internal helper not in the public types
      // @ts-expect-error setDRACOLoader is provided by drei at runtime but not typed
      useGLTF.setDRACOLoader?.(dracoLoader);
      dracoInitialized = true;
    } catch (e) {
      console.warn('[3D] Draco init failed', e);
    }
  }

  // KTX2
  if (!ktx2Initialized) {
    try {
      const ktx2Loader = new KTX2Loader()
        .setTranscoderPath(basePath + 'basis/') // expects /public/basis/ with basis wasm
        .detectSupport(new THREE.WebGLRenderer());
      // setKTX2Loader is an internal helper not in the public types
      // @ts-expect-error setKTX2Loader is provided by drei at runtime but not typed
      useGLTF.setKTX2Loader?.(ktx2Loader);
      ktx2Initialized = true;
    } catch (e) {
      console.warn('[3D] KTX2 init failed', e);
    }
  }
};

// Three.js standard library - only GLTF types
export type { GLTF } from 'three-stdlib';

// Optimized model loading hook
export const useOptimizedGLTF = (url: string) => {
  try {
    return useGLTF(url, true); // Enable draco compression
  } catch (error) {
    console.error('Error loading GLTF:', error);
    throw error;
  }
};

// Optimized animation hook
export const useOptimizedAnimations = (animations: any[], group: any) => {
  try {
    return useAnimations(animations, group);
  } catch (error) {
    console.error('Error setting up animations:', error);
    throw error;
  }
};

// Preload critical models
export const preloadModels = (urls: string[]) => {
  urls.forEach(url => {
    try {
      useGLTF.preload(url);
    } catch (error) {
      console.warn(`Failed to preload model: ${url}`, error);
    }
  });
};

// Optimized Canvas component with default settings
export const getOptimizedCanvasProps = () => ({
  camera: { position: [0, 0, 5], fov: 50 },
  gl: {
    antialias: true,
    alpha: true,
    powerPreference: ((): WebGLPowerPreference => {
      // Network-aware quality: lower power on poor networks
      const n = (navigator as any).connection as { effectiveType?: string } | undefined;
      const type = n?.effectiveType || '';
      if (type.includes('2g') || type.includes('slow-2g')) return 'low-power';
      return 'high-performance';
    })()
  },
  dpr: ((): [number, number] => {
    const n = (navigator as any).connection as { effectiveType?: string } | undefined;
    const type = n?.effectiveType || '';
    // Cap DPR more aggressively on slow networks
    if (type.includes('2g') || type.includes('slow-2g')) return [1, 1];
    if (type.includes('3g')) return [1, 1.5] as unknown as [number, number];
    return [1, 2] as [number, number];
  })(),
  performance: { min: 0.5 } // Lower performance threshold
});

// Optimized lighting setup props
export const getOptimizedLightingProps = () => ({
  ambientLight: { intensity: 0.4 },
  directionalLight: { 
    position: [10, 10, 5] as [number, number, number], 
    intensity: 1,
    castShadow: true,
    'shadow-mapSize-width': 1024,
    'shadow-mapSize-height': 1024
  },
  pointLight: { position: [-10, -10, -10] as [number, number, number], intensity: 0.5 }
});

// Optimized controls props
export const getOptimizedControlsProps = () => ({
  enablePan: true,
  enableZoom: true,
  enableRotate: true,
  enableDamping: true,
  dampingFactor: 0.05,
  maxPolarAngle: Math.PI / 2
});
