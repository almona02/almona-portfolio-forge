/**
 * Performance Dashboard Component
 * Displays real-time performance metrics in development mode
 * Phase 1: Emergency Performance Fixes Monitoring
 */

import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  fcp: number;
  lcp: number;
  tbt: number;
  cls: number;
  connection: string;
  loadTime: number;
}

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: 0,
    lcp: 0,
    tbt: 0,
    cls: 0,
    connection: 'unknown',
    loadTime: 0
  });

  const [optimizations, setOptimizations] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Monitor Core Web Vitals
    const observers: PerformanceObserver[] = [];

    // FCP Observer
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
          }
        });
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
      observers.push(fcpObserver);
    } catch (e) {
      console.warn('FCP observer not supported');
    }

    // LCP Observer
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      observers.push(lcpObserver);
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // CLS Observer
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value || 0;
            setMetrics(prev => ({ ...prev, cls: clsValue }));
          }
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      observers.push(clsObserver);
    } catch (e) {
      console.warn('CLS observer not supported');
    }

    // Check connection
    const conn = (navigator as any).connection || 
                 (navigator as any).mozConnection || 
                 (navigator as any).webkitConnection;
    if (conn) {
      setMetrics(prev => ({ 
        ...prev, 
        connection: conn.effectiveType || 'unknown' 
      }));
    }

    // Check optimizations
    const checkOptimizations = () => {
      const checks = [
        { 
          name: 'Critical CSS', 
          check: () => !!document.querySelector('style#critical-css') 
        },
        { 
          name: 'Hero Image Preload', 
          check: () => !!document.querySelector('link[href*="hero-bg"][rel="preload"]') 
        },
        { 
          name: 'Route Prefetching', 
          check: () => document.querySelectorAll('link[rel="prefetch"]').length > 3 
        },
        { 
          name: 'Service Worker', 
          check: () => 'serviceWorker' in navigator 
        },
        { 
          name: 'Font Optimization', 
          check: () => {
            const fontPreload = document.querySelectorAll('link[as="font"], link[rel="preload"][href*="font"]');
            return fontPreload.length > 0;
          }
        },
        {
          name: 'Hero Image Priority',
          check: () => {
            const heroImg = document.querySelector('img[fetchpriority="high"], img[fetchPriority="high"]');
            return !!heroImg;
          }
        }
      ];

      const activeOptimizations = checks
        .filter(check => check.check())
        .map(check => check.name);

      setOptimizations(activeOptimizations);
    };

    // Initial check
    checkOptimizations();

    // Re-check periodically
    const checkInterval = setInterval(checkOptimizations, 2000);

    // Calculate TBT
    const calculateTBT = () => {
      try {
        const longTasks = performance.getEntriesByType('longtask') as PerformanceEntry[];
        return longTasks.reduce((total, task: any) => total + (task.duration || 0), 0);
      } catch {
        return 0;
      }
    };

    const tbtInterval = setInterval(() => {
      setMetrics(prev => ({ ...prev, tbt: calculateTBT() }));
    }, 1000);

    // Measure load time
    const loadTime = performance.timing ? 
      performance.timing.loadEventEnd - performance.timing.navigationStart : 0;
    setMetrics(prev => ({ ...prev, loadTime }));

    return () => {
      observers.forEach(observer => observer.disconnect());
      clearInterval(checkInterval);
      clearInterval(tbtInterval);
    };
  }, []);

  if (!import.meta.env.DEV) return null;

  const getMetricStatus = (value: number, target: number, isLowerBetter: boolean = true) => {
    if (isLowerBetter) {
      return value <= target ? 'good' : value <= target * 1.5 ? 'warning' : 'bad';
    } else {
      return value >= target ? 'good' : value >= target * 0.75 ? 'warning' : 'bad';
    }
  };

  const fcpStatus = getMetricStatus(metrics.fcp, 1400);
  const lcpStatus = getMetricStatus(metrics.lcp, 2400);
  const tbtStatus = getMetricStatus(metrics.tbt, 400);
  const clsStatus = getMetricStatus(metrics.cls, 0.1);

  return (
    <div className="performance-dashboard" style={{ display: isVisible ? 'block' : 'none' }}>
      <div className="dashboard-header">
        <h3>Phase 1 Performance Dashboard</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="close-btn"
          aria-label="Close dashboard"
        >
          ×
        </button>
      </div>
      
      <div className="metrics-grid">
        <div className={`metric-card ${fcpStatus}`}>
          <div className="metric-value">{Math.round(metrics.fcp)}ms</div>
          <div className="metric-label">FCP</div>
          <div className="metric-target">Target: &lt;1400ms</div>
        </div>
        <div className={`metric-card ${lcpStatus}`}>
          <div className="metric-value">{Math.round(metrics.lcp)}ms</div>
          <div className="metric-label">LCP</div>
          <div className="metric-target">Target: &lt;2400ms</div>
        </div>
        <div className={`metric-card ${tbtStatus}`}>
          <div className="metric-value">{Math.round(metrics.tbt)}ms</div>
          <div className="metric-label">TBT</div>
          <div className="metric-target">Target: &lt;400ms</div>
        </div>
        <div className={`metric-card ${clsStatus}`}>
          <div className="metric-value">{metrics.cls.toFixed(3)}</div>
          <div className="metric-label">CLS</div>
          <div className="metric-target">Target: &lt;0.1</div>
        </div>
      </div>
      
      <div className="dashboard-info">
        <div className="info-row">
          <strong>Connection:</strong> {metrics.connection}
        </div>
        {metrics.loadTime > 0 && (
          <div className="info-row">
            <strong>Load Time:</strong> {Math.round(metrics.loadTime)}ms
          </div>
        )}
      </div>
      
      <div className="optimizations-list">
        <strong>Active Optimizations ({optimizations.length}/6):</strong>
        <ul>
          {optimizations.length > 0 ? (
            optimizations.map(opt => (
              <li key={opt}>✅ {opt}</li>
            ))
          ) : (
            <li className="no-optimizations">No optimizations detected</li>
          )}
        </ul>
      </div>
      
      <style>{`
        .performance-dashboard {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.95);
          color: white;
          padding: 15px;
          border-radius: 10px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12px;
          z-index: 9999;
          max-width: 400px;
          backdrop-filter: blur(10px);
          border: 1px solid #333;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          border-bottom: 1px solid #333;
          padding-bottom: 8px;
        }
        .dashboard-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }
        .close-btn {
          background: transparent;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin: 10px 0;
        }
        .metric-card {
          background: rgba(255, 255, 255, 0.1);
          padding: 8px;
          border-radius: 5px;
          text-align: center;
          border: 2px solid transparent;
        }
        .metric-card.good {
          border-color: #4ade80;
        }
        .metric-card.warning {
          border-color: #fbbf24;
        }
        .metric-card.bad {
          border-color: #ef4444;
        }
        .metric-value {
          font-size: 16px;
          font-weight: bold;
          color: #4ade80;
        }
        .metric-card.warning .metric-value {
          color: #fbbf24;
        }
        .metric-card.bad .metric-value {
          color: #ef4444;
        }
        .metric-label {
          font-size: 10px;
          opacity: 0.8;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .metric-target {
          font-size: 9px;
          opacity: 0.6;
          margin-top: 2px;
        }
        .dashboard-info {
          margin-top: 10px;
          font-size: 11px;
        }
        .info-row {
          margin: 4px 0;
        }
        .optimizations-list {
          margin-top: 10px;
          font-size: 11px;
          border-top: 1px solid #333;
          padding-top: 10px;
        }
        .optimizations-list ul {
          margin: 5px 0 0 0;
          padding-left: 20px;
        }
        .optimizations-list li {
          margin: 2px 0;
          font-size: 10px;
        }
        .no-optimizations {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
};

