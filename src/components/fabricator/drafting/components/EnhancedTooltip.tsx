/**
 * Enhanced Tooltip Component
 * 
 * Gold-tier tooltip with comprehensive descriptions, keyboard shortcuts,
 * usage examples, and error handling.
 * 
 * @since UI/UX Gold-Tier Implementation
 */

import { Info } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { validateNumericProp } from '../utils/componentHardening';
import { formatKeyboardShortcut, getTooltipContent, type TooltipContent } from '../utils/tooltipContent';

interface EnhancedTooltipProps {
  /** Tool or control identifier */
  toolKey: string;
  /** Tooltip trigger element */
  children: React.ReactElement;
  /** Custom tooltip content (overrides registry) */
  customContent?: Partial<TooltipContent>;
  /** Tooltip placement */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing tooltip (ms) */
  delay?: number;
  /** Maximum width of tooltip */
  maxWidth?: number;
  /** Show info icon */
  showInfoIcon?: boolean;
  /** Disable tooltip */
  disabled?: boolean;
}

export const EnhancedTooltip: React.FC<EnhancedTooltipProps> = React.memo(({
  toolKey,
  children,
  customContent,
  placement = 'top',
  delay = 500,
  maxWidth = 300,
  showInfoIcon = false,
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Validate and sanitize props (hardening)
  const validatedToolKey = useMemo(() => {
    if (!toolKey || typeof toolKey !== 'string' || toolKey.length === 0) {
      console.warn('EnhancedTooltip: Invalid toolKey, disabling tooltip');
      return null;
    }
    if (toolKey.length > 100) {
      console.warn('EnhancedTooltip: toolKey too long, truncating');
      return toolKey.substring(0, 100);
    }
    return toolKey;
  }, [toolKey]);

  const validatedPlacement = useMemo(() => {
    const validPlacements = ['top', 'bottom', 'left', 'right'];
    if (!validPlacements.includes(placement)) {
      console.warn(`EnhancedTooltip: Invalid placement "${placement}", using "top"`);
      return 'top';
    }
    return placement;
  }, [placement]);

  const validatedDelay = useMemo(() => {
    return validateNumericProp(delay, 0, 5000, 500, 'delay', 'EnhancedTooltip');
  }, [delay]);

  const validatedMaxWidth = useMemo(() => {
    return validateNumericProp(maxWidth, 100, 1000, 300, 'maxWidth', 'EnhancedTooltip');
  }, [maxWidth]);

  // Memoize tooltip content lookup (performance optimization)
  const content = useMemo(() => {
    if (!validatedToolKey) return null;
    
    const baseContent = getTooltipContent(validatedToolKey);
    if (!baseContent) return null;
    
    return customContent 
      ? { ...baseContent, ...customContent } as TooltipContent
      : baseContent;
  }, [validatedToolKey, customContent]);

  // Update tooltip position (with error handling and debouncing for performance)
  // Must be defined before handleMouseEnter to avoid "used before declaration" error
  // Note: e parameter is kept for API consistency but we use triggerRef.current instead
  const updatePosition = useCallback((_e: React.MouseEvent) => {
    if (!triggerRef.current || !tooltipRef.current) return;

    // Debounce position updates to ~60fps (16ms) for performance
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 16) return;
    lastUpdateTimeRef.current = now;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const spacing = 8;

    let x = 0;
    let y = 0;

    switch (validatedPlacement) {
      case 'top':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        y = triggerRect.top - tooltipRect.height - spacing;
        break;
      case 'bottom':
        x = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
        y = triggerRect.bottom + spacing;
        break;
      case 'left':
        x = triggerRect.left - tooltipRect.width - spacing;
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        break;
      case 'right':
        x = triggerRect.right + spacing;
        y = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        break;
    }

    // Keep tooltip within viewport (with bounds checking)
    const viewportWidth = window.innerWidth || 1920;
    const viewportHeight = window.innerHeight || 1080;

    if (x < 0) x = spacing;
    if (x + tooltipRect.width > viewportWidth) x = Math.max(spacing, viewportWidth - tooltipRect.width - spacing);
    if (y < 0) y = spacing;
    if (y + tooltipRect.height > viewportHeight) y = Math.max(spacing, viewportHeight - tooltipRect.height - spacing);

    setPosition({ x, y });
  }, [validatedPlacement]);

  // Handle mouse enter (with error handling and validated delay)
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (disabled || !validatedToolKey) return;
    
    triggerRef.current = e.currentTarget as HTMLElement;
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Set timeout for delay (using validated delay)
    timeoutRef.current = setTimeout(() => {
      updatePosition(e);
      setIsVisible(true);
    }, validatedDelay);
  }, [disabled, validatedToolKey, validatedDelay, updatePosition]);

  // Handle mouse leave (with error handling)
  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  // Update position on mouse move (with error handling and debouncing)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isVisible) {
      updatePosition(e);
    }
  }, [isVisible, updatePosition]);

  // Portal container for tooltip (renders at document body level to avoid clipping)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Create or get portal container
    let container = document.getElementById('tooltip-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tooltip-portal';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '999999';
      document.body.appendChild(container);
    }
    setPortalContainer(container);

    return () => {
      // Cleanup timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Don't render if disabled or no content (after all hooks)
  if (disabled || !content) {
    return children;
  }

  // Clone child with event handlers
  const childWithProps = React.cloneElement(children, {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onMouseMove: handleMouseMove,
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      if (typeof (children as any).ref === 'function') {
        (children as any).ref(node);
      } else if ((children as any).ref) {
        (children as any).ref.current = node;
      }
    }
  });

  return (
    <>
      {childWithProps}
      {isVisible && portalContainer && createPortal(
        <div
          ref={tooltipRef}
          className="fixed pointer-events-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            maxWidth: `${validatedMaxWidth}px`,
            zIndex: 999999
          }}
          role="tooltip"
          aria-live="polite"
        >
          <div className="bg-slate-950 text-slate-100 rounded-lg shadow-xl border border-amber-600/30 p-3 text-sm backdrop-blur-sm">
            {/* Title */}
            <div className="flex items-center gap-2 mb-2">
              {showInfoIcon && <Info className="w-4 h-4 text-amber-400" />}
              <h4 className="font-semibold text-slate-100">{content.title}</h4>
            </div>
            
            {/* Description */}
            {content.description && (
              <p className="text-slate-300 mb-2 leading-relaxed">{content.description}</p>
            )}
            
            {/* Keyboard Shortcut */}
            {content.keyboardShortcut && (
              <div className="flex items-center gap-2 mb-2 text-xs">
                <span className="text-slate-400">Shortcut:</span>
                <kbd className="px-2 py-1 bg-slate-900 border border-amber-600/30 rounded font-mono text-amber-300">
                  {formatKeyboardShortcut(content.keyboardShortcut)}
                </kbd>
              </div>
            )}
            
            {/* Usage Example */}
            {content.usageExample && (
              <div className="mt-2 pt-2 border-t border-amber-600/20">
                <p className="text-xs text-slate-400 italic">
                  <span className="font-semibold text-slate-300">Example:</span> {content.usageExample}
                </p>
              </div>
            )}
            
            {/* Category badge */}
            <div className="mt-2 pt-2 border-t border-amber-600/20">
              <span className="text-xs text-slate-500 uppercase tracking-wide">
                {content.category}
              </span>
            </div>
          </div>
          
          {/* Arrow - Prestige theme */}
          <div
            className={`absolute w-0 h-0 border-4 ${
              validatedPlacement === 'top' ? 'border-t-slate-950 border-l-transparent border-r-transparent border-b-transparent top-full left-1/2 -translate-x-1/2' :
              validatedPlacement === 'bottom' ? 'border-b-slate-950 border-l-transparent border-r-transparent border-t-transparent bottom-full left-1/2 -translate-x-1/2' :
              validatedPlacement === 'left' ? 'border-l-slate-950 border-t-transparent border-r-transparent border-b-transparent left-full top-1/2 -translate-y-1/2' :
              'border-r-slate-950 border-t-transparent border-l-transparent border-b-transparent right-full top-1/2 -translate-y-1/2'
            }`}
          />
        </div>,
        portalContainer
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo - only re-render if relevant props change
  return (
    prevProps.toolKey === nextProps.toolKey &&
    prevProps.placement === nextProps.placement &&
    prevProps.delay === nextProps.delay &&
    prevProps.maxWidth === nextProps.maxWidth &&
    prevProps.showInfoIcon === nextProps.showInfoIcon &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.children === nextProps.children &&
    JSON.stringify(prevProps.customContent) === JSON.stringify(nextProps.customContent)
  );
});

EnhancedTooltip.displayName = 'EnhancedTooltip';

