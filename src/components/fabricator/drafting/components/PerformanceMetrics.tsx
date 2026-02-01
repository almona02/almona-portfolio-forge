/**
 * Performance Metrics Component
 * 
 * Displays real-time performance metrics (FPS, render time, element count)
 * for debugging and optimization monitoring.
 * 
 * Constitutional: Deterministic metrics, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Activity, Monitor, X, Zap } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { safeEventHandler } from '../utils/componentHardening';

interface PerformanceMetricsProps {
  /** Element count */
  elementCount?: number;
  /** On close */
  onClose?: () => void;
  /** Class name */
  className?: string;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  elementCount = 0,
  onClose,
  className = '',
}) => {
  const [fps, setFps] = useState<number>(0);
  const [renderTime, setRenderTime] = useState<number>(0);
  const [isVisible, setIsVisible] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const frameTimeRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Calculate FPS and render time
  const measurePerformance = useCallback(() => {
    const _frameStart = performance.now();
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    
    // Measure actual frame time (time between frames)
    if (lastTimeRef.current > 0) {
      const frameTime = now - lastTimeRef.current;
      frameTimeRef.current.push(frameTime);
      if (frameTimeRef.current.length > 60) {
        frameTimeRef.current.shift(); // Keep last 60 frames
      }
    }
    
    if (delta >= 1000) {
      // Calculate FPS
      const currentFps = Math.round((frameCountRef.current * 1000) / delta);
      setFps(currentFps);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
      
      // Calculate average render time from frame times
      if (frameTimeRef.current.length > 0) {
        const avgRenderTime = frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length;
        setRenderTime(Math.round(avgRenderTime * 100) / 100);
      }
    }
    
    frameCountRef.current++;
    lastTimeRef.current = now;
    
    if (isVisible) {
      animationFrameRef.current = requestAnimationFrame(measurePerformance);
    }
  }, [isVisible]);

  // Start/stop performance monitoring
  useEffect(() => {
    if (isVisible) {
      lastTimeRef.current = performance.now();
      frameCountRef.current = 0;
      frameTimeRef.current = [];
      animationFrameRef.current = requestAnimationFrame(measurePerformance);
    } else {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
    
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isVisible, measurePerformance]);

  // Toggle visibility
  const handleToggle = safeEventHandler(() => {
    setIsVisible(prev => !prev);
  }, 'PerformanceMetrics', 'toggle');

  // Get performance status color
  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-emerald-400';
    if (value >= thresholds.warning) return 'text-amber-400';
    return 'text-red-400';
  };

  const fpsColor = getPerformanceColor(fps, { good: 55, warning: 30 });
  const renderTimeColor = getPerformanceColor(60 - renderTime, { good: 55, warning: 30 });

  if (!isVisible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        className={`h-4 px-1.5 text-[10px] text-slate-400 hover:text-amber-400 ${className}`}
        title="Show Performance Metrics"
      >
        <Monitor className="h-2.5 w-2.5" />
      </Button>
    );
  }

  return (
    <div className={`flex items-center gap-1 px-1.5 py-0.5 bg-slate-900/80 border border-amber-600/20 rounded ${className}`}>
      <div className="flex items-center gap-2 text-[10px]">
        <div className="flex items-center gap-0.5">
          <Activity className={`h-2.5 w-2.5 ${fpsColor}`} />
          <span className="text-slate-400">FPS:</span>
          <span className={`font-mono font-medium ${fpsColor}`}>{fps}</span>
        </div>
        
        <div className="flex items-center gap-0.5">
          <Zap className={`h-2.5 w-2.5 ${renderTimeColor}`} />
          <span className="text-slate-400">Render:</span>
          <span className={`font-mono font-medium ${renderTimeColor}`}>{renderTime.toFixed(1)}ms</span>
        </div>
        
        <div className="flex items-center gap-0.5">
          <span className="text-slate-400">Elements:</span>
          <Badge variant="outline" className="text-[10px] border-amber-600/30 text-amber-400 bg-amber-500/10 px-1.5 py-0.5">
            {elementCount}
          </Badge>
        </div>
      </div>
      
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-3 w-3 text-slate-400 hover:text-slate-200"
        >
          <X className="h-2 w-2" />
        </Button>
      )}
    </div>
  );
};

export default PerformanceMetrics;

