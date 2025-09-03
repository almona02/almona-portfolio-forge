// Performance measurement utilities for error boundaries
interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class ErrorBoundaryPerformanceTracker {
  private marks: Map<string, PerformanceMark> = new Map();
  private enabled: boolean;

  constructor() {
    // Only enable in development or when explicitly requested
    this.enabled = import.meta.env.DEV || import.meta.env.VITE_TRACK_ERROR_BOUNDARY_PERFORMANCE === 'true';
  }

  startMark(name: string): void {
    if (!this.enabled) return;

    this.marks.set(name, {
      name,
      startTime: performance.now()
    });
  }

  endMark(name: string): number | null {
    if (!this.enabled) return null;

    const mark = this.marks.get(name);
    if (!mark) return null;

    const endTime = performance.now();
    const duration = endTime - mark.startTime;

    mark.endTime = endTime;
    mark.duration = duration;

    // Log slow error boundary operations
    if (duration > 10) { // More than 10ms
      console.warn(`Slow error boundary operation: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  getMark(name: string): PerformanceMark | undefined {
    return this.marks.get(name);
  }

  getAllMarks(): PerformanceMark[] {
    return Array.from(this.marks.values()).filter(mark => mark.duration !== undefined);
  }

  getAverageTime(namePattern: string): number {
    const matchingMarks = this.getAllMarks().filter(mark => 
      mark.name.includes(namePattern) && mark.duration !== undefined
    );

    if (matchingMarks.length === 0) return 0;

    const totalTime = matchingMarks.reduce((sum, mark) => sum + (mark.duration || 0), 0);
    return totalTime / matchingMarks.length;
  }

  clear(): void {
    this.marks.clear();
  }

  generateReport(): string {
    if (!this.enabled) return 'Performance tracking disabled';

    const allMarks = this.getAllMarks();
    if (allMarks.length === 0) return 'No performance data available';

    let report = '=== Error Boundary Performance Report ===\n';
    report += `Total operations tracked: ${allMarks.length}\n\n`;

    // Group by operation type
    const groupedMarks = allMarks.reduce((groups, mark) => {
      const type = mark.name.split(':')[0];
      if (!groups[type]) groups[type] = [];
      groups[type].push(mark);
      return groups;
    }, {} as Record<string, PerformanceMark[]>);

    Object.entries(groupedMarks).forEach(([type, marks]) => {
      const avgTime = marks.reduce((sum, mark) => sum + (mark.duration || 0), 0) / marks.length;
      const maxTime = Math.max(...marks.map(mark => mark.duration || 0));
      const minTime = Math.min(...marks.map(mark => mark.duration || 0));

      report += `${type}:\n`;
      report += `  Operations: ${marks.length}\n`;
      report += `  Average: ${avgTime.toFixed(2)}ms\n`;
      report += `  Min: ${minTime.toFixed(2)}ms\n`;
      report += `  Max: ${maxTime.toFixed(2)}ms\n\n`;
    });

    return report;
  }
}

// Global instance
export const errorBoundaryTracker = new ErrorBoundaryPerformanceTracker();

// Decorator for measuring error boundary methods
export function measureErrorBoundaryMethod(target: unknown, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = function (...args: unknown[]) {
    const markName = `${target.constructor.name}:${propertyName}`;
    errorBoundaryTracker.startMark(markName);
    
    try {
      const result = method.apply(this, args);
      
      // Handle async methods
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          errorBoundaryTracker.endMark(markName);
        });
      }
      
      errorBoundaryTracker.endMark(markName);
      return result;
    } catch (error) {
      errorBoundaryTracker.endMark(markName);
      throw error;
    }
  };

  return descriptor;
}

// Hook for components to measure their error boundary impact
export function useErrorBoundaryPerformance(componentName: string) {
  const startMeasurement = (operation: string) => {
    errorBoundaryTracker.startMark(`${componentName}:${operation}`);
  };

  const endMeasurement = (operation: string) => {
    return errorBoundaryTracker.endMark(`${componentName}:${operation}`);
  };

  return { startMeasurement, endMeasurement };
}

// Utility to log performance report to console
export function logErrorBoundaryPerformanceReport() {
  console.group('🛡️ Error Boundary Performance Report');
  console.log(errorBoundaryTracker.generateReport());
  console.groupEnd();
}

// Auto-generate report in development
if (import.meta.env.DEV) {
  // Generate report after 30 seconds of app usage
  setTimeout(() => {
    logErrorBoundaryPerformanceReport();
  }, 30000);
}
