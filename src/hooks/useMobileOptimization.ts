/**
 * useMobileOptimization Hook
 * ---------------------------------------------------------------------------
 * Optimizes performance and UX for mobile devices and low-end hardware
 * 
 * Features:
 * - Detects mobile devices and low-end hardware
 * - Reduces animation complexity automatically
 * - Respects prefers-reduced-motion preference
 * - Applies CSS custom properties for animation scaling
 * 
 * Usage:
 * ```tsx
 * const { isMobile, isLowEndDevice } = useMobileOptimization();
 * 
 * {isMobile ? (
 *   <MobileOptimizedFabricatorView />
 * ) : (
 *   <FullFabricatorWorkspace />
 * )}
 * ```
 */

import { useState, useEffect } from 'react';

export interface MobileOptimizationResult {
  /** True if device is mobile (width < 768px) */
  isMobile: boolean;
  /** True if device has low-end hardware (limited CPU/memory) */
  isLowEndDevice: boolean;
  /** True if user prefers reduced motion */
  prefersReducedMotion: boolean;
  /** Combined flag: true if mobile OR low-end device */
  shouldOptimize: boolean;
}

/**
 * React hook for mobile and low-end device optimization
 * 
 * Automatically detects device capabilities and applies optimizations:
 * - Reduces animation complexity on mobile/low-end devices
 * - Respects user's motion preferences
 * - Sets CSS custom properties for animation scaling
 * 
 * @returns MobileOptimizationResult with device detection flags
 * 
 * @example
 * ```tsx
 * const { isMobile, isLowEndDevice, shouldOptimize } = useMobileOptimization();
 * 
 * // Conditionally render lighter components
 * {shouldOptimize ? (
 *   <MobileOptimizedFabricatorView />
 * ) : (
 *   <FullFabricatorWorkspace />
 * )}
 * 
 * // Adjust 3D model quality
 * <Model3D quality={isLowEndDevice ? 'low' : 'high'} />
 * ```
 */
export function useMobileOptimization(): MobileOptimizationResult {
  const [isMobile, setIsMobile] = useState(false);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Detect low-end devices based on hardware capabilities
      const hardwareConcurrency = navigator.hardwareConcurrency || 4;
      const deviceMemory = (navigator as any).deviceMemory || 4;
      
      // Consider device low-end if:
      // - Less than 4 CPU cores, OR
      // - Less than 4GB RAM, OR
      // - Connection is slow (if available)
      const connection = (navigator as any).connection;
      const isSlowConnection = connection && (
        connection.effectiveType === 'slow-2g' || 
        connection.effectiveType === '2g'
      );
      
      const isLowEnd = 
        hardwareConcurrency < 4 || 
        deviceMemory < 4 || 
        isSlowConnection;
      
      setIsLowEndDevice(isLowEnd);
      
      // Apply CSS custom properties for animation optimization
      if (mobile || isLowEnd) {
        document.documentElement.style.setProperty('--animation-scale', '0.8');
        document.documentElement.style.setProperty('--animation-duration', '0.3s');
        
        // Disable heavy animations on low-end devices
        if (isLowEnd) {
          document.documentElement.classList.add('reduce-motion');
        } else {
          document.documentElement.classList.remove('reduce-motion');
        }
      } else {
        document.documentElement.style.removeProperty('--animation-scale');
        document.documentElement.style.removeProperty('--animation-duration');
        document.documentElement.classList.remove('reduce-motion');
      }
    };
    
    // Check for reduced motion preference
    const checkReducedMotion = () => {
      const prefersReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const prefersReduced = prefersReducedMotionQuery.matches;
      
      setPrefersReducedMotion(prefersReduced);
      
      if (prefersReduced) {
        document.documentElement.classList.add('reduce-motion');
      }
    };
    
    // Initial checks
    checkMobile();
    checkReducedMotion();
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    
    // Listen for reduced motion preference changes
    const prefersReducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) {
        document.documentElement.classList.add('reduce-motion');
      } else {
        // Only remove if not already added by low-end device detection
        if (!isLowEndDevice) {
          document.documentElement.classList.remove('reduce-motion');
        }
      }
    };
    
    // Modern browsers support addEventListener on MediaQueryList
    if (prefersReducedMotionQuery.addEventListener) {
      prefersReducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    } else {
      // Fallback for older browsers
      prefersReducedMotionQuery.addListener(handleReducedMotionChange);
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile);
      if (prefersReducedMotionQuery.removeEventListener) {
        prefersReducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      } else {
        prefersReducedMotionQuery.removeListener(handleReducedMotionChange);
      }
    };
  }, [isLowEndDevice]);
  
  return {
    isMobile,
    isLowEndDevice,
    prefersReducedMotion,
    shouldOptimize: isMobile || isLowEndDevice || prefersReducedMotion,
  };
}

/**
 * CSS Custom Properties Usage
 * 
 * Add these to your global CSS to use the animation scale:
 * 
 * ```css
 * .animate-scale {
 *   transform: scale(var(--animation-scale, 1));
 *   transition-duration: var(--animation-duration, 0.3s);
 * }
 * 
 * .reduce-motion *,
 * .reduce-motion *::before,
 * .reduce-motion *::after {
 *   animation-duration: 0.01ms !important;
 *   animation-iteration-count: 1 !important;
 *   transition-duration: 0.01ms !important;
 * }
 * ```
 */

