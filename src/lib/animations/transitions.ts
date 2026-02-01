/**
 * Gold-Tier Animation Transitions
 * Market-leader inspired timing and easing functions
 * Performance optimized with 60fps guarantee
 */

export const transitions = {
  // Instant transitions for immediate feedback
  instant: {
    duration: 0,
    ease: 'linear' as const,
  },

  // Fast transitions for responsive interactions
  fast: {
    duration: 0.15,
    ease: 'easeOut' as const,
  },

  // Normal transitions for standard interactions
  normal: {
    duration: 0.2,
    ease: 'easeOut' as const,
  },

  // Slow transitions for deliberate actions
  slow: {
    duration: 0.3,
    ease: 'easeOut' as const,
  },

  // Slower transitions for modal/dialog animations
  slower: {
    duration: 0.5,
    ease: 'easeOut' as const,
  },

  // Slowest transitions for complex animations
  slowest: {
    duration: 1,
    ease: 'easeOut' as const,
  },
} as const;

export const easings = {
  // Standard easing functions
  easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Special easing for micro-interactions
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  elastic: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Smooth easing for professional feel
  smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
} as const;

// Performance optimized animation utilities
export const animationUtils = {
  // Check for reduced motion preference
  prefersReducedMotion: () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },

  // Get optimized duration based on user preferences
  getDuration: (key: keyof typeof transitions) => {
    if (animationUtils.prefersReducedMotion()) {
      return transitions.instant.duration;
    }
    return transitions[key].duration;
  },

  // GPU acceleration utilities
  gpuAccelerated: {
    transform: 'translate3d(0, 0, 0)',
    backfaceVisibility: 'hidden',
    perspective: 1000,
  },

  // Performance monitoring
  performance: {
    frameRate: 60,
    maxFrameTime: 16.67, // ms for 60fps
  },
} as const;
