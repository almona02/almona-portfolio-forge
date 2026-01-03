import React, { ComponentType, ReactNode, useEffect, useState } from 'react';

/**
 * Lazy Motion Utility - Lazy loads Framer Motion to reduce initial bundle size
 * 
 * Framer Motion is ~150KB and is used in 66 files. By lazy loading it,
 * we can reduce the initial react-vendor bundle by ~150KB.
 * 
 * Usage:
 * ```tsx
 * import { LazyMotionDiv } from '@/utils/lazyMotion';
 * 
 * // Drop-in replacement for motion.div
 * <LazyMotionDiv
 *   initial={{ opacity: 0 }}
 *   animate={{ opacity: 1 }}
 * >
 *   Content
 * </LazyMotionDiv>
 * ```
 */

// Cache for loaded Framer Motion to avoid multiple loads
let framerMotionCache: any = null;
let framerMotionPromise: Promise<any> | null = null;

/**
 * Dynamically import Framer Motion
 */
async function loadFramerMotion() {
  if (framerMotionCache) {
    return framerMotionCache;
  }
  
  if (framerMotionPromise) {
    return framerMotionPromise;
  }
  
  framerMotionPromise = import('framer-motion').then(module => {
    framerMotionCache = module;
    return module;
  });
  
  return framerMotionPromise;
}

interface LazyMotionProps {
  component?: keyof JSX.IntrinsicElements | ComponentType<any>;
  children: ReactNode;
  [key: string]: any; // Allow all motion props
}

/**
 * Lazy Motion Component - Drop-in replacement for motion components
 * 
 * Automatically lazy loads Framer Motion when first used
 */
export const LazyMotion: React.FC<LazyMotionProps> = ({ 
  component = 'div', 
  children, 
  ...motionProps 
}) => {
  const [MotionComponent, setMotionComponent] = useState<ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    loadFramerMotion()
      .then((module) => {
        if (!isMounted) return;
        
        try {
          const { motion } = module;
          if (motion && typeof component === 'string') {
            // For string components like 'div', 'section', etc.
            const motionElement = motion[component as keyof typeof motion];
            if (motionElement) {
              setMotionComponent(() => motionElement);
            } else {
              // Fallback if motion element doesn't exist
              setMotionComponent(() => ((props: any) => React.createElement(component as keyof JSX.IntrinsicElements, props)) as ComponentType<any>);
            }
          } else if (motion && component) {
            // For component references
            setMotionComponent(() => motion(component));
          } else {
            // Fallback to regular element
            if (typeof component === 'string') {
              setMotionComponent(() => ((props: any) => React.createElement(component as keyof JSX.IntrinsicElements, props)) as ComponentType<any>);
            } else {
              setMotionComponent(() => component as ComponentType<any>);
            }
          }
          setIsLoading(false);
        } catch (error) {
          console.error('Error setting up LazyMotion:', error);
          setMotionComponent(() => component as ComponentType<any>);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error('Error loading Framer Motion:', error);
        // Fallback to regular element if Framer Motion fails to load
        setMotionComponent(() => component as ComponentType<any>);
        setIsLoading(false);
      });
    
    return () => {
      isMounted = false;
    };
  }, [component]);

  if (isLoading || !MotionComponent) {
    try {
      // Render without animation while loading (prevents layout shift)
      // Filter out Framer Motion-specific props to avoid React warnings
      const safeProps: any = {};
      const motionPropKeys = [
        'initial', 'animate', 'exit', 'transition', 'variants',
        'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView',
        'layout', 'layoutId', 'layoutDependency',
        'drag', 'dragConstraints', 'dragElastic', 'dragMomentum', 'dragPropagation',
        'dragDirectionLock', 'dragTransition',
        'onDrag', 'onDragStart', 'onDragEnd',
        'onAnimationStart', 'onAnimationComplete', 'onUpdate',
        'onHoverStart', 'onHoverEnd', 'onTapStart', 'onTap', 'onTapCancel',
        'onPan', 'onPanStart', 'onPanEnd', 'onPanSessionStart', 'onPanSessionEnd',
        'onViewportEnter', 'onViewportLeave'
      ];
      
      // Only keep safe HTML attributes (exclude React special props like 'key', 'ref')
      const reactSpecialProps = ['key', 'ref', 'children'];
      for (const key in motionProps) {
        if (!reactSpecialProps.includes(key) && !motionPropKeys.includes(key)) {
          safeProps[key] = motionProps[key];
        }
      }
      
      if (typeof component === 'string') {
        const Element = component as keyof JSX.IntrinsicElements;
        return React.createElement(Element, safeProps, children);
      }
      return React.createElement(component as ComponentType<any>, safeProps, children);
    } catch (error) {
      console.error('Error rendering LazyMotion fallback:', error);
      // Ultimate fallback - just render children in a div
      if (typeof component === 'string') {
        const Element = component as keyof JSX.IntrinsicElements;
        return React.createElement(Element, {}, children);
      }
      return React.createElement(component as ComponentType<any>, {}, children);
    }
  }

  return React.createElement(MotionComponent, motionProps, children);
};

/**
 * Lazy Motion Div - Convenience component for motion.div
 */
export const LazyMotionDiv: React.FC<Omit<LazyMotionProps, 'component'>> = ({ children, ...props }) => {
  return <LazyMotion component="div" {...props}>{children}</LazyMotion>;
};

/**
 * Lazy Motion Section - Convenience component for motion.section
 */
export const LazyMotionSection: React.FC<Omit<LazyMotionProps, 'component'>> = ({ children, ...props }) => {
  return <LazyMotion component="section" {...props}>{children}</LazyMotion>;
};

/**
 * Lazy Motion Button - Convenience component for motion.button
 */
export const LazyMotionButton: React.FC<Omit<LazyMotionProps, 'component'>> = ({ children, ...props }) => {
  return <LazyMotion component="button" {...props}>{children}</LazyMotion>;
};

/**
 * Lazy AnimatePresence - Lazy loads AnimatePresence component
 */
export const LazyAnimatePresence: React.FC<{ children: ReactNode; [key: string]: any }> = ({ 
  children, 
  ...props 
}) => {
  const [AnimatePresenceComponent, setAnimatePresenceComponent] = useState<ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFramerMotion().then((module) => {
      setAnimatePresenceComponent(() => module.AnimatePresence || (({ children }: { children: ReactNode }) => React.createElement(React.Fragment, null, children)));
      setIsLoading(false);
    }).catch(() => {
      // Fallback to Fragment if AnimatePresence fails to load
      setAnimatePresenceComponent(() => ({ children }: { children: ReactNode }) => React.createElement(React.Fragment, null, children));
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !AnimatePresenceComponent) {
    return React.createElement(React.Fragment, null, children);
  }

  return React.createElement(AnimatePresenceComponent, props, children);
};

