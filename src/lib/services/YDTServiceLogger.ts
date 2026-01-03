/**
 * YDT Service Logger - Track YDT usage in Services
 * 
 * Logs all YDT service interactions for metrics and analytics.
 * Week 1 implementation: localStorage-based (simple, no infrastructure)
 * 
 * Status: Week 1 Implementation (Jan 2, 2026)
 */

export interface YDTServiceEvent {
  service: 'ticket_assignment' | 'resolution_prediction' | 'spare_parts';
  operation: string;
  success: boolean;
  confidence?: number;
  responseTime?: number;
  fallbackUsed?: boolean;
  source?: 'ydt_live' | 'ydt_cached' | 'baseline' | 'fallback';
  ticketId?: string;
  error?: string;
}

export interface YDTServiceLog {
  timestamp: string;
  service: string;
  operation: string;
  success: boolean;
  confidence: number;
  responseTime: number;
  fallbackUsed: boolean;
  source: string;
  ticketId?: string;
  error?: string;
}

export interface YDTServiceMetrics {
  totalCalls: number;
  successRate: number;
  avgConfidence: number;
  avgResponseTime: number;
  fallbackRate: number;
  callsByService: Record<string, number>;
  callsBySource: Record<string, number>;
}

export class YDTServiceLogger {
  private static instance: YDTServiceLogger;
  private logs: YDTServiceLog[] = [];
  private maxLogs = 1000; // Keep last 1000 logs
  
  private constructor() {
    this.loadLogs();
  }
  
  static getInstance(): YDTServiceLogger {
    if (!YDTServiceLogger.instance) {
      YDTServiceLogger.instance = new YDTServiceLogger();
    }
    return YDTServiceLogger.instance;
  }
  
  /**
   * Log a YDT service event
   */
  logUsage(event: YDTServiceEvent): void {
    const log: YDTServiceLog = {
      timestamp: new Date().toISOString(),
      service: event.service,
      operation: event.operation,
      success: event.success,
      confidence: event.confidence || 0,
      responseTime: event.responseTime || 0,
      fallbackUsed: event.fallbackUsed || false,
      source: event.source || 'unknown',
      ticketId: event.ticketId,
      error: event.error
    };
    
    this.logs.push(log);
    
    // Keep only last maxLogs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Persist to localStorage (Week 1 simplicity)
    this.saveLogs();
    
    // Console log for debugging (Week 1)
    if (process.env.NODE_ENV === 'development') {
      console.log('YDT Service Log:', log);
    }
  }
  
  /**
   * Get usage metrics for a time period
   */
  getUsageMetrics(since?: Date): YDTServiceMetrics {
    const cutoff = since || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
    const relevantLogs = this.logs.filter(log => 
      new Date(log.timestamp) >= cutoff
    );
    
    if (relevantLogs.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        avgConfidence: 0,
        avgResponseTime: 0,
        fallbackRate: 0,
        callsByService: {},
        callsBySource: {}
      };
    }
    
    const successCount = relevantLogs.filter(l => l.success).length;
    const fallbackCount = relevantLogs.filter(l => l.fallbackUsed).length;
    
    const callsByService: Record<string, number> = {};
    const callsBySource: Record<string, number> = {};
    
    relevantLogs.forEach(log => {
      callsByService[log.service] = (callsByService[log.service] || 0) + 1;
      callsBySource[log.source] = (callsBySource[log.source] || 0) + 1;
    });
    
    return {
      totalCalls: relevantLogs.length,
      successRate: successCount / relevantLogs.length,
      avgConfidence: relevantLogs.reduce((sum, l) => sum + l.confidence, 0) / relevantLogs.length,
      avgResponseTime: relevantLogs.reduce((sum, l) => sum + l.responseTime, 0) / relevantLogs.length,
      fallbackRate: fallbackCount / relevantLogs.length,
      callsByService,
      callsBySource
    };
  }
  
  /**
   * Get today's metrics
   */
  getTodayMetrics(): YDTServiceMetrics {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.getUsageMetrics(today);
  }
  
  /**
   * Get metrics for a specific service
   */
  getServiceMetrics(service: string, since?: Date): YDTServiceMetrics {
    const cutoff = since || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const serviceLogs = this.logs.filter(log => 
      log.service === service && new Date(log.timestamp) >= cutoff
    );
    
    if (serviceLogs.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        avgConfidence: 0,
        avgResponseTime: 0,
        fallbackRate: 0,
        callsByService: {},
        callsBySource: {}
      };
    }
    
    const successCount = serviceLogs.filter(l => l.success).length;
    const fallbackCount = serviceLogs.filter(l => l.fallbackUsed).length;
    
    return {
      totalCalls: serviceLogs.length,
      successRate: successCount / serviceLogs.length,
      avgConfidence: serviceLogs.reduce((sum, l) => sum + l.confidence, 0) / serviceLogs.length,
      avgResponseTime: serviceLogs.reduce((sum, l) => sum + l.responseTime, 0) / serviceLogs.length,
      fallbackRate: fallbackCount / serviceLogs.length,
      callsByService: { [service]: serviceLogs.length },
      callsBySource: {}
    };
  }
  
  /**
   * Get all logs (for debugging/admin)
   */
  getAllLogs(): YDTServiceLog[] {
    return [...this.logs];
  }
  
  /**
   * Clear logs (for testing/reset)
   */
  clearLogs(): void {
    this.logs = [];
    this.saveLogs();
  }
  
  /**
   * Load logs from localStorage
   */
  private loadLogs(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('ydt_service_logs');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.logs = parsed.map((log: any) => ({
          ...log,
          timestamp: log.timestamp // Keep as string
        }));
        
        // Keep only last maxLogs
        if (this.logs.length > this.maxLogs) {
          this.logs = this.logs.slice(-this.maxLogs);
        }
      }
    } catch (error) {
      console.warn('Failed to load YDT service logs:', error);
      this.logs = [];
    }
  }
  
  /**
   * Save logs to localStorage
   */
  private saveLogs(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('ydt_service_logs', JSON.stringify(this.logs));
    } catch (error) {
      console.warn('Failed to save YDT service logs:', error);
      // If storage is full, remove oldest logs
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.logs = this.logs.slice(-Math.floor(this.maxLogs / 2));
        try {
          localStorage.setItem('ydt_service_logs', JSON.stringify(this.logs));
        } catch (e) {
          console.error('Failed to save YDT logs after cleanup:', e);
        }
      }
    }
  }
}

// Export singleton instance
export const ydtServiceLogger = YDTServiceLogger.getInstance();

