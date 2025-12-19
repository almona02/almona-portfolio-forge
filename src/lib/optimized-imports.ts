/**
 * Optimized Imports - Lazy Loading for Heavy Libraries
 * 
 * This module provides lazy-loaded imports for heavy libraries that should
 * only be loaded when needed, reducing initial bundle size.
 * 
 * Usage:
 *   const THREE = await lazyThree();
 *   const tf = await lazyTensorFlow();
 */

// Heavy imports that should be lazy-loaded
export const lazyThree = () => import('three');
export const lazyReactThreeFiber = () => import('@react-three/fiber');
export const lazyReactThreeDrei = () => import('@react-three/drei');
export const lazyTensorFlow = () => import('@tensorflow/tfjs');
export const lazyExcelJS = () => import('exceljs');
export const lazyPDFJS = () => import('pdfjs-dist');

// Component lazy loading wrappers
export const lazy3DViewer = () => import('@/components/3d-model/EnhancedGLBViewer');
export const lazyAIAdvisor = () => import('@/components/ai/AiEquipmentAdvisor');
export const lazyPDFExport = () => import('@/components/exports/PDFExportDialog');
export const lazyExcelExport = () => import('@/components/exports/ExcelExportDialog');

