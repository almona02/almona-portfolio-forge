/**
 * ContextualTooltips Component
 * ---------------------------------------------------------------------------
 * Smart hints and feature discovery system for Fabricator workflow
 * 
 * Features:
 * - Smart hints based on user progress
 * - Feature discovery system
 * - Dismissible with "Don't show again"
 * - Progress tracking
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Lightbulb, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent } from '@/shared/ui/ui/card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface TooltipConfig {
  id: string;
  title: string;
  description: string;
  targetSelector: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  trigger?: 'immediate' | 'on-hover' | 'on-click' | 'after-delay';
  delay?: number; // Delay in ms before showing
  condition?: () => boolean; // Condition to check before showing
  priority?: number; // Higher priority tooltips show first
}

const TOOLTIP_STORAGE_KEY = 'fabricator_tooltips_dismissed';

export interface ContextualTooltipsProps {
  /** Tooltip configurations */
  tooltips: TooltipConfig[];
  /** Whether tooltips are enabled */
  enabled?: boolean;
  /** Callback when tooltip is dismissed */
  onDismiss?: (tooltipId: string, dontShowAgain: boolean) => void;
  /** Custom className */
  className?: string;
}

export const ContextualTooltips: React.FC<ContextualTooltipsProps> = ({
  tooltips,
  enabled = true,
  onDismiss,
  className
}) => {
  const [dismissedTooltips, setDismissedTooltips] = useState<Set<string>>(new Set());
  const [activeTooltip, setActiveTooltip] = useState<TooltipConfig | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Load dismissed tooltips from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const dismissed = localStorage.getItem(TOOLTIP_STORAGE_KEY);
      if (dismissed) {
        setDismissedTooltips(new Set(JSON.parse(dismissed)));
      }
    } catch (error) {
      console.warn('Failed to load dismissed tooltips:', error);
    }
  }, []);

  // Find and show next available tooltip
  useEffect(() => {
    if (!enabled) return;

    const availableTooltips = tooltips
      .filter(tooltip => {
        // Skip if dismissed
        if (dismissedTooltips.has(tooltip.id)) return false;

        // Check condition
        if (tooltip.condition && !tooltip.condition()) return false;

        // Check if target element exists
        const element = document.querySelector(tooltip.targetSelector);
        if (!element) return false;

        return true;
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    if (availableTooltips.length === 0) return;

    const nextTooltip = availableTooltips[0];
    const element = document.querySelector(nextTooltip.targetSelector) as HTMLElement;

    if (!element) return;

    const showTooltip = () => {
      setTargetElement(element);
      setActiveTooltip(nextTooltip);
    };

    if (nextTooltip.trigger === 'immediate') {
      showTooltip();
    } else if (nextTooltip.trigger === 'after-delay') {
      const delay = nextTooltip.delay || 2000;
      const timer = setTimeout(showTooltip, delay);
      return () => clearTimeout(timer);
    } else if (nextTooltip.trigger === 'on-hover') {
      const handleHover = () => showTooltip();
      element.addEventListener('mouseenter', handleHover);
      return () => element.removeEventListener('mouseenter', handleHover);
    } else if (nextTooltip.trigger === 'on-click') {
      const handleClick = () => showTooltip();
      element.addEventListener('click', handleClick);
      return () => element.removeEventListener('click', handleClick);
    }
  }, [enabled, tooltips, dismissedTooltips]);

  // Position tooltip relative to target element
  useEffect(() => {
    if (!activeTooltip || !targetElement || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const rect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const position = activeTooltip.position || 'auto';

    let top = 0;
    let left = 0;

    // Calculate position based on preference
    if (position === 'top' || (position === 'auto' && rect.top > window.innerHeight / 2)) {
      top = rect.top - tooltipRect.height - 10;
      left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    } else if (position === 'bottom' || position === 'auto') {
      top = rect.bottom + 10;
      left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    } else if (position === 'left') {
      top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
      left = rect.left - tooltipRect.width - 10;
    } else if (position === 'right') {
      top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
      left = rect.right + 10;
    }

    // Keep tooltip within viewport
    top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));
    left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }, [activeTooltip, targetElement]);

  // Highlight target element
  useEffect(() => {
    if (!targetElement || !overlayRef.current) return;

    const rect = targetElement.getBoundingClientRect();
    const overlay = overlayRef.current;

    overlay.style.display = 'block';
    overlay.style.clipPath = `polygon(
      0% 0%,
      0% 100%,
      ${rect.left}px 100%,
      ${rect.left}px ${rect.top}px,
      ${rect.right}px ${rect.top}px,
      ${rect.right}px ${rect.bottom}px,
      ${rect.left}px ${rect.bottom}px,
      ${rect.left}px 100%,
      100% 100%,
      100% 0%
    )`;

    return () => {
      overlay.style.display = 'none';
    };
  }, [targetElement]);

  const handleDismiss = (dontShowAgain: boolean) => {
    if (!activeTooltip) return;

    const newDismissed = new Set(dismissedTooltips);
    if (dontShowAgain) {
      newDismissed.add(activeTooltip.id);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(TOOLTIP_STORAGE_KEY, JSON.stringify(Array.from(newDismissed)));
        } catch (error) {
          console.warn('Failed to save dismissed tooltips:', error);
        }
      }
    }

    setDismissedTooltips(newDismissed);
    onDismiss?.(activeTooltip.id, dontShowAgain);
    setActiveTooltip(null);
    setTargetElement(null);
  };

  if (!enabled || !activeTooltip) return null;

  return (
    <>
      {/* Overlay with cutout for highlighted element */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/50 z-40 pointer-events-none"
        style={{ display: 'none' }}
      />

      {/* Tooltip */}
      <AnimatePresence>
        {activeTooltip && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              'fixed z-50 pointer-events-auto',
              className
            )}
          >
            <Card className="w-80 shadow-xl border-orange-500/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Lightbulb className="h-4 w-4 text-orange-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1">{activeTooltip.title}</h4>
                    <p className="text-xs text-gray-600 mb-3">{activeTooltip.description}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDismiss(false)}
                        className="text-xs h-7"
                      >
                        Got it
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDismiss(true)}
                        className="text-xs h-7 text-gray-500"
                      >
                        Don't show again
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(false)}
                    className="h-6 w-6 p-0 flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Hook to manage contextual tooltips
 */
export const useContextualTooltips = () => {
  const [tooltips, setTooltips] = useState<TooltipConfig[]>([]);
  const [enabled, setEnabled] = useState(true);

  const addTooltip = (tooltip: TooltipConfig) => {
    setTooltips(prev => [...prev, tooltip]);
  };

  const removeTooltip = (id: string) => {
    setTooltips(prev => prev.filter(t => t.id !== id));
  };

  const clearTooltips = () => {
    setTooltips([]);
  };

  return {
    tooltips,
    enabled,
    setEnabled,
    addTooltip,
    removeTooltip,
    clearTooltips,
  };
};

export default ContextualTooltips;

