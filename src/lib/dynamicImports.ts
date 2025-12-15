/**
 * Dynamic imports for heavy modules
 * Use these instead of static imports to reduce initial bundle size
 */

// AI/ML Services
export const loadTensorFlow = () => import('@tensorflow/tfjs');
export const loadGoogleAI = () => import('@google/generative-ai');
export const loadHuggingFace = () => import('@huggingface/inference');

// Document Processing
export const loadExcelJS = () => import('exceljs');
export const loadPDFLib = () => import('pdf-lib');

// 3D Libraries (if not already lazy loaded)
export const loadThree = () => import('three');
export const loadReactThreeFiber = () => import('@react-three/fiber');
export const loadReactThreeDrei = () => import('@react-three/drei');

// Chart Libraries
export const loadRecharts = () => import('recharts');

// Optimization Algorithms (if heavy)
export const loadOptimizationEngine = () => 
  import('@/algorithms/smartDraw').then(m => m.generateComponentsFromGrid);

