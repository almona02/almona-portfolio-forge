/**
 * Intelligent route prefetching hook optimized for Egyptian workflow patterns
 * Prefetches likely next routes based on current location and user behavior
 * Phase 1.5: Component-Level Code Splitting
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Egypt-specific prefetching patterns based on workshop workflow
const EGYPT_WORKFLOW_PATTERNS: Record<string, string[]> = {
  // Home page users likely go to fabricator workflow
  '/': ['/fabricator-workflow'],
  
  // Fabricator workflow users need tuning and optimization
  '/fabricator-workflow': [
    '/fabricator/tuning-studio-no-dxf',
    '/fabricator/system-tuning-studio',
    '/optimization/cutting'
  ],
  
  // Tuning studio users need optimization and CNC export
  '/fabricator/tuning-studio-no-dxf': [
    '/optimization/cutting',
    '/exports/cnc',
    '/inventory/check'
  ],
  
  // Optimization users need CNC export and production planning
  '/optimization/cutting': [
    '/exports/cnc',
    '/production/planning',
    '/quality/control'
  ],
  
  // Dashboard users need analytics and reports
  '/dashboard': ['/analytics/performance', '/reports/material-usage']
};

// Component chunk mapping for deeper prefetching
// Note: Actual chunk names will be determined after build - update based on dist/assets output
const COMPONENT_CHUNKS: Record<string, string[]> = {
  '/fabricator-workflow': [
    'FabricatorWorkflow',
    'EgyptProjectWizard',
    'MaterialSelector'
  ],
  '/fabricator/tuning-studio-no-dxf': [
    'NoDXFTuningStudio',
    'SystemPackSelector',
    'ProfileRoleEditor'
  ],
  '/optimization/cutting': [
    'GeneticOptimizer',
    'RemnantFirstOptimizer',
    'CutListGenerator'
  ],
  '/exports/cnc': [
    'YILMAZExporter',
    'DXFGenerator',
    'QRCodeLabeler'
  ]
};

export const useRoutePrefetching = () => {
  const location = useLocation();
  const prefetchedRoutes = useRef<Set<string>>(new Set());
  const prefetchedComponents = useRef<Set<string>>(new Set());

  // Prefetch a route and its associated components
  const prefetchRoute = useCallback((route: string) => {
    if (prefetchedRoutes.current.has(route)) return;
    
    // Prefetch the route document
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    link.as = 'document';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    
    prefetchedRoutes.current.add(route);
    
    // Also prefetch associated component chunks
    // Note: In production, these will be auto-prefetched by Vite's module preload
    // This is a fallback for explicit component prefetching
    if (COMPONENT_CHUNKS[route]) {
      COMPONENT_CHUNKS[route].forEach(component => {
        if (prefetchedComponents.current.has(component)) return;
        
        // Vite will handle chunk prefetching automatically via module preload
        // This is just for logging/documentation
        prefetchedComponents.current.add(component);
      });
    }
    
    if (import.meta.env.DEV) {
      console.log(`[Almona Egypt] Prefetched route: ${route}`);
    }
  }, []);

  // Prefetch on hover for navigation links
  const setupLinkPrefetching = useCallback(() => {
    const links = document.querySelectorAll('a[href^="/"]');
    
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href || prefetchedRoutes.current.has(href)) return;
      
      const prefetchHandler = () => prefetchRoute(href);
      
      link.addEventListener('mouseenter', prefetchHandler, { once: true });
      link.addEventListener('touchstart', prefetchHandler, { once: true });
      link.addEventListener('focus', prefetchHandler, { once: true });
    });
  }, [prefetchRoute]);

  // Auto-prefetch based on current location
  useEffect(() => {
    const currentPath = location.pathname;
    const patterns = EGYPT_WORKFLOW_PATTERNS[currentPath];
    
    if (patterns) {
      // Small delay to prioritize current page load
      const timer = setTimeout(() => {
        patterns.forEach(route => prefetchRoute(route));
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [location.pathname, prefetchRoute]);

  // Setup link prefetching on mount and route changes
  useEffect(() => {
    // Wait for page to be interactive
    const timer = setTimeout(setupLinkPrefetching, 2000);
    return () => clearTimeout(timer);
  }, [location.pathname, setupLinkPrefetching]);

  return { prefetchRoute };
};
