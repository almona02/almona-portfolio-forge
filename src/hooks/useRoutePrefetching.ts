import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface PrefetchConfig {
  routes: string[];
  delay?: number;
  priority?: 'high' | 'medium' | 'low';
}

// Route prefetching configuration
const PREFETCH_CONFIG: Record<string, PrefetchConfig> = {
  '/': {
    routes: ['/products', '/services', '/about'],
    delay: 2000,
    priority: 'high'
  },
  '/products': {
    routes: ['/products/machines', '/quote', '/shop'],
    delay: 1000,
    priority: 'high'
  },
  '/services': {
    routes: ['/contact', '/quote'],
    delay: 1500,
    priority: 'medium'
  },
  '/shop': {
    routes: ['/usedmachines', '/spare-parts'],
    delay: 1000,
    priority: 'medium'
  }
};

export function useRoutePrefetching() {
  const location = useLocation();

  const prefetchRoute = useCallback(async (route: string) => {
    try {
      // Create a link element for prefetching
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      link.as = 'document';
      
      // Add to head for prefetching
      document.head.appendChild(link);
      
      // Clean up after a delay
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 5000);
      
      console.log(`Prefetched route: ${route}`);
    } catch (error) {
      console.warn(`Failed to prefetch route ${route}:`, error);
    }
  }, []);

  const prefetchRoutes = useCallback(async (routes: string[], delay: number = 0) => {
    if (delay > 0) {
      setTimeout(() => {
        routes.forEach(route => prefetchRoute(route));
      }, delay);
    } else {
      routes.forEach(route => prefetchRoute(route));
    }
  }, [prefetchRoute]);

  useEffect(() => {
    const config = PREFETCH_CONFIG[location.pathname];
    
    if (config) {
      const { routes, delay = 0, priority = 'medium' } = config;
      
      // Only prefetch on high priority routes immediately
      if (priority === 'high') {
        prefetchRoutes(routes, delay);
      } else {
        // For medium/low priority, wait for user to be idle
        const timeoutId = setTimeout(() => {
          prefetchRoutes(routes, 0);
        }, delay + 2000);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [location.pathname, prefetchRoutes]);

  return {
    prefetchRoute,
    prefetchRoutes
  };
}

// Hook for prefetching on hover/focus
export function useHoverPrefetching() {
  const { prefetchRoute } = useRoutePrefetching();

  const handleLinkHover = useCallback((href: string) => {
    // Debounce prefetching to avoid excessive requests
    const timeoutId = setTimeout(() => {
      prefetchRoute(href);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [prefetchRoute]);

  return {
    handleLinkHover
  };
}
