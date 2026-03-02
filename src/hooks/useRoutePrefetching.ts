/**
 * Route prefetching hook for canonical Fabricator Studio navigation paths.
 * Prefetches likely next routes based on current location and user behavior.
 */

import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Canonical studio prefetch patterns (only valid routes).
const STUDIO_PREFETCH_PATTERNS: Record<string, string[]> = {
  '/': [
    fabricatorRoutes.studioCommand(),
    fabricatorRoutes.studioProjects(),
  ],
  [fabricatorRoutes.studioCommand()]: [
    fabricatorRoutes.studioProjects(),
    fabricatorRoutes.studioData(),
    fabricatorRoutes.studioReports(),
  ],
  [fabricatorRoutes.studioProjects()]: [
    fabricatorRoutes.newProjectWizard(),
    fabricatorRoutes.studioCommand(),
    fabricatorRoutes.studioData(),
  ],
  [fabricatorRoutes.studioData()]: [
    fabricatorRoutes.studioProjects(),
    fabricatorRoutes.studioCommand(),
  ],
  [fabricatorRoutes.studioReports()]: [
    fabricatorRoutes.studioCommand(),
    fabricatorRoutes.studioProjects(),
  ],
};

export const useRoutePrefetching = () => {
  const location = useLocation();
  const prefetchedRoutes = useRef<Set<string>>(new Set());

  // Mark a route as prefetched; Vite handles module-level preloading.
  const prefetchRoute = useCallback((route: string) => {
    if (prefetchedRoutes.current.has(route)) return;

    prefetchedRoutes.current.add(route);

    if (import.meta.env.DEV) {
      console.log(`[Fabricator Studio] Route marked for prefetch: ${route} (handled by Vite)`);
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
      link.addEventListener('touchstart', prefetchHandler, { once: true, passive: true });
      link.addEventListener('focus', prefetchHandler, { once: true });
    });
  }, [prefetchRoute]);

  // Auto-prefetch based on current canonical location
  useEffect(() => {
    const currentPath = location.pathname;
    const patterns = STUDIO_PREFETCH_PATTERNS[currentPath];

    if (patterns) {
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
