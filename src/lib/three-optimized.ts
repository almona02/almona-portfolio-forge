/**
 * Optimized Three.js imports to reduce bundle size
 * This file provides tree-shakeable imports for Three.js components
 */

// Core Three.js - only import what we need
export { 
  Scene, 
  PerspectiveCamera, 
  WebGLRenderer, 
  AmbientLight, 
  DirectionalLight, 
  PointLight, 
  SpotLight,
  Group,
  Object3D,
  Vector3,
  Euler,
  Color,
  Fog,
  FogExp2
} from 'three';

// React Three Fiber - core components only
export { 
  Canvas, 
  useFrame, 
  useThree, 
  extend,
  createRoot
} from '@react-three/fiber';

// React Three Drei - selective imports
export { 
  OrbitControls,
  useGLTF,
  useAnimations,
  Environment,
  ContactShadows,
  Float,
  Text,
  Html,
  useProgress,
  Loader
} from '@react-three/drei';

// Three.js standard library - only GLTF types
export type { GLTF } from 'three-stdlib';

// Optimized model loading hook
export const useOptimizedGLTF = (url: string) => {
  return useGLTF(url, true); // Enable draco compression
};

// Optimized animation hook
export const useOptimizedAnimations = (animations: any[], group: any) => {
  return useAnimations(animations, group);
};

// Preload critical models
export const preloadModels = (urls: string[]) => {
  urls.forEach(url => {
    useGLTF.preload(url);
  });
};

// Optimized Canvas component with default settings
export const getOptimizedCanvasProps = () => ({
  camera: { position: [0, 0, 5], fov: 50 },
  gl: { 
    antialias: true, 
    alpha: true,
    powerPreference: "high-performance" as const
  },
  dpr: [1, 2] as [number, number], // Limit device pixel ratio for better performance
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
