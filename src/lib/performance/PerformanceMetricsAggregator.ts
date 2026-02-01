/**
 * Performance Metrics Aggregator
 * 
 * Aggregates metrics from all performance monitoring systems.
 * Provides unified interface for Performance Audit Dashboard.
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import { MemoryMonitor } from '../3d/MemoryMonitor';
import { getNetworkPerformanceMonitor } from '../network/NetworkPerformanceMonitor';
import { MemoryLeakDetector } from './MemoryLeakDetector';
import { PerformanceAuditResult } from './WorkflowPerformanceAudit';

/**
 * End-to-end workflow metrics
 */
export interface WorkflowMetrics {
  simpleWindow: {
    target: number; // ms
    current: number | null; // ms
    status: 'good' | 'warning' | 'bad';
  };
  complexFacade: {
    target: number; // ms
    current: number | null; // ms
    status: 'good' | 'warning' | 'bad';
  };
  batch10x: {
    target: number; // ms
    current: number | null; // ms
    status: 'good' | 'warning' | 'bad';
  };
}

/**
 * Memory stability metrics
 */
export interface MemoryStabilityMetrics {
  heapStart: number | null; // MB
  heapEnd: number | null; // MB
  domNodesStart: number | null;
  domNodesEnd: number | null;
  memoryLeaks: {
    detected: boolean;
    issues: string[];
  };
}

/**
 * Network performance metrics
 */
export interface NetworkMetrics {
  bundleSize: {
    target: number; // MB
    current: number | null; // MB
    status: 'good' | 'warning' | 'bad';
  };
  tti3G: {
    target: number; // ms
    current: number | null; // ms
    status: 'good' | 'warning' | 'bad';
  };
  dxfUpload10MB: {
    target: number; // ms
    current: number | null; // ms
    status: 'good' | 'warning' | 'bad';
  };
}

/**
 * Database performance metrics
 */
export interface DatabaseMetrics {
  avgQueryTime: {
    target: number; // ms
    current: number | null; // ms
    status: 'good' | 'warning' | 'bad';
  };
  slowQueries: {
    target: number; // count
    current: number | null; // count
    status: 'good' | 'warning' | 'bad';
  };
  connectionPool: {
    status: 'healthy' | 'warning' | 'unhealthy';
    issues: string[];
  };
}

/**
 * UI responsiveness metrics
 */
export interface UIResponsivenessMetrics {
  inputLag: {
    target: number; // ms
    current: number | null; // ms
    status: 'good' | 'warning' | 'bad';
  };
  animationFPS: {
    target: number;
    current: number | null;
    status: 'good' | 'warning' | 'bad';
  };
  reactRenderTime: {
    target: number; // ms
    current: number | null; // ms
    status: 'good' | 'warning' | 'bad';
  };
}

/**
 * Complete performance audit metrics
 */
export interface PerformanceAuditMetrics {
  workflow: WorkflowMetrics;
  memory: MemoryStabilityMetrics;
  network: NetworkMetrics;
  database: DatabaseMetrics;
  ui: UIResponsivenessMetrics;
  lastUpdated: number;
}

/**
 * Performance Metrics Aggregator
 */
export class PerformanceMetricsAggregator {
  private static instance: PerformanceMetricsAggregator;
  private workflowAudits: Map<string, PerformanceAuditResult> = new Map();
  private memoryDetector: MemoryLeakDetector | null = null;
  private networkMonitor = getNetworkPerformanceMonitor();
  private memoryMonitor = MemoryMonitor.getInstance();
  private uiMetrics: {
    inputLag: number[];
    animationFPS: number[];
    reactRenderTime: number[];
  } = {
    inputLag: [],
    animationFPS: [],
    reactRenderTime: [],
  };

  private constructor() {
    this.initializeUIMonitoring();
  }

  static getInstance(): PerformanceMetricsAggregator {
    if (!PerformanceMetricsAggregator.instance) {
      PerformanceMetricsAggregator.instance = new PerformanceMetricsAggregator();
    }
    return PerformanceMetricsAggregator.instance;
  }

  /**
   * Initialize UI performance monitoring
   */
  private initializeUIMonitoring(): void {
    // Monitor input lag
    if (typeof window !== 'undefined') {
      this.monitorInputLag();
      this.monitorAnimationFPS();
    }
  }

  /**
   * Monitor input lag
   */
  private monitorInputLag(): void {
    if (typeof window === 'undefined') return;

    const measureInputLag = () => {
      const start = performance.now();
      
      requestAnimationFrame(() => {
        const lag = performance.now() - start;
        this.uiMetrics.inputLag.push(lag);
        
        // Keep only last 100 measurements
        if (this.uiMetrics.inputLag.length > 100) {
          this.uiMetrics.inputLag.shift();
        }
      });
    };

    // Measure input lag periodically
    setInterval(measureInputLag, 1000);
  }

  /**
   * Monitor animation FPS
   */
  private monitorAnimationFPS(): void {
    if (typeof window === 'undefined') return;

    let lastTime = performance.now();
    let frameCount = 0;
    const fpsHistory: number[] = [];

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTime;

      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        fpsHistory.push(fps);
        
        // Keep only last 60 measurements (1 minute at 1s intervals)
        if (fpsHistory.length > 60) {
          fpsHistory.shift();
        }

        // Calculate average FPS
        if (fpsHistory.length > 0) {
          const avgFPS = fpsHistory.reduce((sum, f) => sum + f, 0) / fpsHistory.length;
          this.uiMetrics.animationFPS.push(avgFPS);
          
          if (this.uiMetrics.animationFPS.length > 10) {
            this.uiMetrics.animationFPS.shift();
          }
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Record workflow audit result
   */
  recordWorkflowAudit(audit: PerformanceAuditResult): void {
    this.workflowAudits.set(audit.workflowId, audit);
    
    // Keep only last 100 audits
    if (this.workflowAudits.size > 100) {
      const firstKey = this.workflowAudits.keys().next().value;
      this.workflowAudits.delete(firstKey);
    }
  }

  /**
   * Set memory leak detector
   */
  setMemoryDetector(detector: MemoryLeakDetector): void {
    this.memoryDetector = detector;
  }

  /**
   * Record React render time
   */
  recordReactRenderTime(timeMs: number): void {
    this.uiMetrics.reactRenderTime.push(timeMs);
    
    // Keep only last 100 measurements
    if (this.uiMetrics.reactRenderTime.length > 100) {
      this.uiMetrics.reactRenderTime.shift();
    }
  }

  /**
   * Get workflow metrics
   */
  private getWorkflowMetrics(): WorkflowMetrics {
    const audits = Array.from(this.workflowAudits.values());
    
    // Simple window: 1x1 grid, basic profile
    const simpleAudits = audits.filter(a => 
      a.phaseDurations.validation < 200 && a.totalDuration < 2000
    );
    const simpleAvg = simpleAudits.length > 0
      ? simpleAudits.reduce((sum, a) => sum + a.totalDuration, 0) / simpleAudits.length
      : null;

    // Complex facade: 10x10 grid, mixed profiles
    const complexAudits = audits.filter(a => 
      a.phaseDurations.validation > 500 && a.totalDuration < 5000
    );
    const complexAvg = complexAudits.length > 0
      ? complexAudits.reduce((sum, a) => sum + a.totalDuration, 0) / complexAudits.length
      : null;

    // Batch: 10 designs (sum of durations)
    const batchAudits = audits.slice(-10);
    const batchTotal = batchAudits.length === 10
      ? batchAudits.reduce((sum, a) => sum + a.totalDuration, 0)
      : null;

    return {
      simpleWindow: {
        target: 2000,
        current: simpleAvg,
        status: this.getStatus(simpleAvg, 2000, true),
      },
      complexFacade: {
        target: 5000,
        current: complexAvg,
        status: this.getStatus(complexAvg, 5000, true),
      },
      batch10x: {
        target: 20000,
        current: batchTotal,
        status: this.getStatus(batchTotal, 20000, true),
      },
    };
  }

  /**
   * Get memory stability metrics
   */
  private getMemoryStabilityMetrics(): MemoryStabilityMetrics {
    const memoryStats = this.memoryMonitor.getMemoryStats();
    const issues: string[] = [];

    let heapStart: number | null = null;
    let heapEnd: number | null = null;
    let domNodesStart: number | null = null;
    let domNodesEnd: number | null = null;

    if (this.memoryDetector) {
      const checkpoints = this.memoryDetector.getAllCheckpoints();
      if (checkpoints.length > 0) {
        const first = checkpoints[0];
        const last = checkpoints[checkpoints.length - 1];
        
        if (first?.heap) heapStart = first.heap.used;
        if (last?.heap) heapEnd = last.heap.used;
        domNodesStart = first?.domNodes ?? null;
        domNodesEnd = last?.domNodes ?? null;

        // Check for leaks (simplified - would use full leak detection in production)
        if (heapStart && heapEnd && heapEnd > heapStart * 1.5) {
          issues.push('Potential heap memory leak detected');
        }
        if (domNodesStart && domNodesEnd && domNodesEnd > domNodesStart * 1.5) {
          issues.push('Potential DOM node leak detected');
        }
      }
    } else if (memoryStats) {
      heapEnd = memoryStats.usedJSHeapSize / 1024 / 1024; // MB
      domNodesEnd = document.querySelectorAll('*').length;
    }

    return {
      heapStart,
      heapEnd,
      domNodesStart,
      domNodesEnd,
      memoryLeaks: {
        detected: issues.length > 0,
        issues,
      },
    };
  }

  /**
   * Get network metrics
   */
  private getNetworkMetrics(): NetworkMetrics {
    const summary = this.networkMonitor.getSummary();
    
    // Bundle size - would need to be fetched from build metrics
    const bundleSize: number | null = null; // TODO: Fetch from build stats
    
    // TTI on 3G - would need network throttling test
    const tti3G: number | null = null; // TODO: Measure TTI on 3G
    
    // DXF upload 10MB - from network monitor
    const dxfUploads = summary.slowRequests.filter(r => 
      r.url.includes('dxf') || r.url.includes('upload')
    );
    const dxfUploadTime = dxfUploads.length > 0
      ? dxfUploads[0].duration
      : null;

    return {
      bundleSize: {
        target: 2, // MB
        current: bundleSize,
        status: this.getStatus(bundleSize, 2, true),
      },
      tti3G: {
        target: 5000, // ms
        current: tti3G,
        status: this.getStatus(tti3G, 5000, true),
      },
      dxfUpload10MB: {
        target: 3000, // ms
        current: dxfUploadTime,
        status: this.getStatus(dxfUploadTime, 3000, true),
      },
    };
  }

  /**
   * Get database metrics (would be fetched from backend)
   */
  private async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    // These would be fetched from backend API
    // For now, return placeholders
    return {
      avgQueryTime: {
        target: 50,
        current: null, // Fetched from backend
        status: 'good',
      },
      slowQueries: {
        target: 0,
        current: null, // Fetched from backend
        status: 'good',
      },
      connectionPool: {
        status: 'healthy',
        issues: [],
      },
    };
  }

  /**
   * Get UI responsiveness metrics
   */
  private getUIResponsivenessMetrics(): UIResponsivenessMetrics {
    const avgInputLag = this.uiMetrics.inputLag.length > 0
      ? this.uiMetrics.inputLag.reduce((sum, lag) => sum + lag, 0) / this.uiMetrics.inputLag.length
      : null;

    const avgFPS = this.uiMetrics.animationFPS.length > 0
      ? this.uiMetrics.animationFPS[this.uiMetrics.animationFPS.length - 1]
      : null;

    const avgRenderTime = this.uiMetrics.reactRenderTime.length > 0
      ? this.uiMetrics.reactRenderTime.reduce((sum, time) => sum + time, 0) / this.uiMetrics.reactRenderTime.length
      : null;

    return {
      inputLag: {
        target: 16,
        current: avgInputLag,
        status: this.getStatus(avgInputLag, 16, true),
      },
      animationFPS: {
        target: 60,
        current: avgFPS,
        status: this.getStatus(avgFPS, 60, false),
      },
      reactRenderTime: {
        target: 50,
        current: avgRenderTime,
        status: this.getStatus(avgRenderTime, 50, true),
      },
    };
  }

  /**
   * Get status based on value and target
   */
  private getStatus(
    value: number | null,
    target: number,
    isLowerBetter: boolean
  ): 'good' | 'warning' | 'bad' {
    if (value === null) return 'good';
    
    if (isLowerBetter) {
      if (value <= target) return 'good';
      if (value <= target * 1.5) return 'warning';
      return 'bad';
    } else {
      if (value >= target) return 'good';
      if (value >= target * 0.75) return 'warning';
      return 'bad';
    }
  }

  /**
   * Get all performance metrics
   */
  async getMetrics(): Promise<PerformanceAuditMetrics> {
    const database = await this.getDatabaseMetrics();

    return {
      workflow: this.getWorkflowMetrics(),
      memory: this.getMemoryStabilityMetrics(),
      network: this.getNetworkMetrics(),
      database,
      ui: this.getUIResponsivenessMetrics(),
      lastUpdated: Date.now(),
    };
  }
}

/**
 * Get performance metrics aggregator instance
 */
export function getPerformanceMetricsAggregator(): PerformanceMetricsAggregator {
  return PerformanceMetricsAggregator.getInstance();
}
