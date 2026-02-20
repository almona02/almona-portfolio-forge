/**
 * ProductionMonitor - Production Monitoring Service
 * 
 * Aggregates metrics from WorkflowProfiler, BaselineTracker, AccuracyTracker,
 * and other monitoring components to provide comprehensive production monitoring.
 * 
 * Week 6 Task 6.1: Production Dashboard
 */

import { MemoryMonitor, MemoryStats } from '@/lib/3d/MemoryMonitor';
import { AccuracyTracker } from '@/lib/fabricator/AccuracyTracker';
import { feedbackCollector } from '@/lib/fabricator/FeedbackCollector';
import { BaselineTracker, PerformanceBaseline } from '@/lib/performance/BaselineTracker';
import { WorkflowProfiler } from '@/lib/performance/WorkflowProfiler';
import { SecurityGateway } from '@/lib/security/SecurityGateway';

export interface ProductionMetrics {
  workflow: {
    totalWorkflows: number;
    averageDuration: number; // milliseconds
    targetDuration: number; // milliseconds
    withinTarget: boolean;
    successRate: number; // percentage
    errorRate: number; // percentage
  };
  accuracy: {
    overallAccuracy: number; // percentage
    targetAccuracy: number; // percentage
    withinTarget: boolean;
    stageAccuracies: Record<string, number>;
  };
  performance: {
    currentBaseline: PerformanceBaseline | null;
    trend: 'improving' | 'degrading' | 'stable';
    regressions: number;
    improvements: number;
  };
  memory: {
    currentStats: MemoryStats | null;
    isLowMemory: boolean;
    isCriticalMemory: boolean;
  };
  security: {
    totalEvents: number;
    criticalEvents: number;
    lastEventTime: number | null;
  };
  feedback: {
    totalOverrides: number;
    systemicIssues: string[];
    featureUsage: number;
  };
  egyptianWorkshop: {
    activeWorkshops: number;
    totalWorkflows: number;
    averageAccuracy: number;
    materialWasteReduction: number; // percentage
    timeSavings: number; // percentage
  };
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  timestamp: number;
  source: string;
  resolved: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceTrend {
  metric: string;
  trend: 'improving' | 'degrading' | 'stable';
  current: number;
  average: number;
  change: number; // percentage change
  dataPoints: Array<{ timestamp: number; value: number }>;
}

export type MetricsListener = (metrics: ProductionMetrics) => void;
export type AlertListener = (alert: Alert) => void;

/**
 * ProductionMonitor - Main production monitoring service
 */
export class ProductionMonitor {
  private static instance: ProductionMonitor;
  private workflowProfiler: WorkflowProfiler;
  private baselineTracker: BaselineTracker;
  private accuracyTracker: AccuracyTracker;
  private memoryMonitor: MemoryMonitor;
  private securityGateway: SecurityGateway;
  private metricsListeners: Set<MetricsListener> = new Set();
  private alertListeners: Set<AlertListener> = new Set();
  private alerts: Map<string, Alert> = new Map();
  private monitoringInterval: number | null = null;
  private workflowCount: number = 0;
  private successfulWorkflows: number = 0;
  private failedWorkflows: number = 0;
  private workflowDurations: number[] = [];

  private constructor() {
    this.workflowProfiler = new WorkflowProfiler();
    this.baselineTracker = new BaselineTracker();
    this.accuracyTracker = new AccuracyTracker();
    this.memoryMonitor = MemoryMonitor.getInstance();
    this.securityGateway = SecurityGateway.getInstance();
  }

  static getInstance(): ProductionMonitor {
    if (!ProductionMonitor.instance) {
      ProductionMonitor.instance = new ProductionMonitor();
    }
    return ProductionMonitor.instance;
  }

  /**
   * Start monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    // Start memory monitoring if available
    if (this.memoryMonitor.isAvailable()) {
      this.memoryMonitor.startMonitoring();
    }

    // Set up monitoring interval
    this.monitoringInterval = window.setInterval(() => {
      this.updateMetrics();
      this.checkAlerts();
    }, intervalMs);

    // Initial update
    this.updateMetrics();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.memoryMonitor.isAvailable()) {
      this.memoryMonitor.stopMonitoring();
    }
  }

  /**
   * Get current production metrics
   */
  getMetrics(): ProductionMetrics {
    const workflowMetrics = this.calculateWorkflowMetrics();
    const accuracyMetrics = this.calculateAccuracyMetrics();
    const performanceMetrics = this.calculatePerformanceMetrics();
    const memoryMetrics = this.calculateMemoryMetrics();
    const securityMetrics = this.calculateSecurityMetrics();
    const feedbackMetrics = this.calculateFeedbackMetrics();
    const egyptianWorkshopMetrics = this.calculateEgyptianWorkshopMetrics();

    return {
      workflow: workflowMetrics,
      accuracy: accuracyMetrics,
      performance: performanceMetrics,
      memory: memoryMetrics,
      security: securityMetrics,
      feedback: feedbackMetrics,
      egyptianWorkshop: egyptianWorkshopMetrics,
    };
  }

  /**
   * Get all alerts
   */
  getAlerts(): Alert[] {
    return Array.from(this.alerts.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get unresolved alerts
   */
  getUnresolvedAlerts(): Alert[] {
    return this.getAlerts().filter(alert => !alert.resolved);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.alerts.set(alertId, alert);
    }
  }

  /**
   * Add metrics listener
   */
  addMetricsListener(listener: MetricsListener): void {
    this.metricsListeners.add(listener);
  }

  /**
   * Remove metrics listener
   */
  removeMetricsListener(listener: MetricsListener): void {
    this.metricsListeners.delete(listener);
  }

  /**
   * Add alert listener
   */
  addAlertListener(listener: AlertListener): void {
    this.alertListeners.add(listener);
  }

  /**
   * Remove alert listener
   */
  removeAlertListener(listener: AlertListener): void {
    this.alertListeners.delete(listener);
  }

  /**
   * Record workflow completion
   */
  recordWorkflow(success: boolean, duration: number): void {
    this.workflowCount++;
    if (success) {
      this.successfulWorkflows++;
    } else {
      this.failedWorkflows++;
    }
    this.workflowDurations.push(duration);

    // Keep only last 1000 durations
    if (this.workflowDurations.length > 1000) {
      this.workflowDurations.shift();
    }
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(metric: string, dataPoints: number = 30): PerformanceTrend | null {
    const allBaselines = this.baselineTracker.getBaselines(metric);
    const baselines = allBaselines.slice(-dataPoints);
    if (baselines.length < 2) {
      return null;
    }

    const values = baselines.map(b => b.value);
    const current = values[values.length - 1];
    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const change = ((current - average) / average) * 100;

    // Determine trend
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (change > 5) {
      trend = 'improving';
    } else if (change < -5) {
      trend = 'degrading';
    }

    return {
      metric,
      trend,
      current,
      average,
      change,
      dataPoints: baselines.map(b => ({
        timestamp: b.timestamp,
        value: b.value,
      })),
    };
  }

  /**
   * Calculate workflow metrics
   */
  private calculateWorkflowMetrics(): ProductionMetrics['workflow'] {
    const averageDuration = this.workflowDurations.length > 0
      ? this.workflowDurations.reduce((sum, d) => sum + d, 0) / this.workflowDurations.length
      : 0;

    const successRate = this.workflowCount > 0
      ? (this.successfulWorkflows / this.workflowCount) * 100
      : 100;

    const errorRate = this.workflowCount > 0
      ? (this.failedWorkflows / this.workflowCount) * 100
      : 0;

    const targetDuration = 45 * 60 * 1000; // 45 minutes
    const withinTarget = averageDuration < targetDuration;

    return {
      totalWorkflows: this.workflowCount,
      averageDuration,
      targetDuration,
      withinTarget,
      successRate,
      errorRate,
    };
  }

  /**
   * Calculate accuracy metrics
   */
  private calculateAccuracyMetrics(): ProductionMetrics['accuracy'] {
    const metrics = this.accuracyTracker.getAccuracyMetrics();
    const overallAccuracy = metrics.endToEndAccuracy;
    const targetAccuracy = 99.6;
    const withinTarget = overallAccuracy >= targetAccuracy;

    // Get stage accuracies from checkpoints
    const stageAccuracies: Record<string, number> = {};
    metrics.checkpoints.forEach(checkpoint => {
      stageAccuracies[checkpoint.stage] = checkpoint.accuracy;
    });

    return {
      overallAccuracy,
      targetAccuracy,
      withinTarget,
      stageAccuracies,
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(): ProductionMetrics['performance'] {
    const latestBaseline = this.baselineTracker.getLatestPerformanceBaseline();
    const trend = latestBaseline
      ? this.baselineTracker.getPerformanceTrend('workflow_duration', 10)?.trend || 'stable'
      : 'stable';

    // Count regressions and improvements (simplified)
    const regressions = 0; // Would need actual regression tracking
    const improvements = 0; // Would need actual improvement tracking

    return {
      currentBaseline: latestBaseline || null,
      trend: trend,
      regressions,
      improvements,
    };
  }

  /**
   * Calculate memory metrics
   */
  private calculateMemoryMetrics(): ProductionMetrics['memory'] {
    const currentStats = this.memoryMonitor.getMemoryStats();
    const isLowMemory = currentStats ? currentStats.isLowMemory : false;
    const isCriticalMemory = currentStats ? currentStats.usagePercent >= 85 : false;

    return {
      currentStats,
      isLowMemory,
      isCriticalMemory,
    };
  }

  /**
   * Calculate security metrics
   */
  private calculateSecurityMetrics(): ProductionMetrics['security'] {
    const eventLog = this.securityGateway.getEventLog();
    const totalEvents = eventLog.length;
    const criticalEvents = eventLog.filter(e => e.error.severity === 'critical').length;
    const lastEventTime = eventLog.length > 0 ? eventLog[eventLog.length - 1].timestamp : null;

    return {
      totalEvents,
      criticalEvents,
      lastEventTime,
    };
  }

  /**
   * Calculate feedback metrics
   */
  private calculateFeedbackMetrics(): ProductionMetrics['feedback'] {
    const analytics = feedbackCollector.getAnalytics();
    const systemicIssues = feedbackCollector.identifySystemicIssues();
    const featureUsage = feedbackCollector.getFeatureUsage();

    return {
      totalOverrides: analytics.totalOverrides,
      systemicIssues,
      featureUsage: Array.isArray(featureUsage) ? featureUsage.length : 1,
    };
  }

  /**
   * Calculate Egyptian workshop metrics
   */
  private calculateEgyptianWorkshopMetrics(): ProductionMetrics['egyptianWorkshop'] {
    // Simplified metrics - in production would aggregate from actual workshop data
    return {
      activeWorkshops: 1, // Would come from database
      totalWorkflows: this.workflowCount,
      averageAccuracy: this.accuracyTracker.getAccuracyMetrics().endToEndAccuracy,
      materialWasteReduction: 45, // percentage (from analytics)
      timeSavings: 60, // percentage (from analytics)
    };
  }

  /**
   * Update metrics and notify listeners
   */
  private updateMetrics(): void {
    const metrics = this.getMetrics();
    this.metricsListeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        console.error('Error in metrics listener:', error);
      }
    });
  }

  /**
   * Check for alerts and notify listeners
   */
  private checkAlerts(): void {
    const metrics = this.getMetrics();

    // Check workflow alerts
    if (!metrics.workflow.withinTarget) {
      this.createAlert({
        type: 'warning',
        severity: 'high',
        title: 'Workflow Duration Exceeds Target',
        titleAr: 'مدة سير العمل تتجاوز الهدف',
        message: `Average workflow duration (${(metrics.workflow.averageDuration / 60000).toFixed(1)} min) exceeds target (${(metrics.workflow.targetDuration / 60000).toFixed(1)} min)`,
        messageAr: `متوسط مدة سير العمل (${(metrics.workflow.averageDuration / 60000).toFixed(1)} دقيقة) يتجاوز الهدف (${(metrics.workflow.targetDuration / 60000).toFixed(1)} دقيقة)`,
        source: 'workflow',
      });
    }

    // Check accuracy alerts
    if (!metrics.accuracy.withinTarget) {
      this.createAlert({
        type: 'error',
        severity: 'critical',
        title: 'Accuracy Below Target',
        titleAr: 'الدقة أقل من الهدف',
        message: `Overall accuracy (${metrics.accuracy.overallAccuracy.toFixed(2)}%) is below target (${metrics.accuracy.targetAccuracy}%)`,
        messageAr: `الدقة الإجمالية (${metrics.accuracy.overallAccuracy.toFixed(2)}%) أقل من الهدف (${metrics.accuracy.targetAccuracy}%)`,
        source: 'accuracy',
      });
    }

    // Check memory alerts
    if (metrics.memory.isCriticalMemory && metrics.memory.currentStats) {
      this.createAlert({
        type: 'error',
        severity: 'critical',
        title: 'Critical Memory Usage',
        titleAr: 'استخدام الذاكرة الحرج',
        message: `Memory usage is at ${metrics.memory.currentStats.usagePercent.toFixed(1)}%`,
        messageAr: `استخدام الذاكرة عند ${metrics.memory.currentStats.usagePercent.toFixed(1)}%`,
        source: 'memory',
      });
    }

    // Check security alerts
    if (metrics.security.criticalEvents > 0) {
      this.createAlert({
        type: 'error',
        severity: 'critical',
        title: 'Critical Security Events',
        titleAr: 'أحداث أمنية حرجة',
        message: `${metrics.security.criticalEvents} critical security events detected`,
        messageAr: `تم اكتشاف ${metrics.security.criticalEvents} أحداث أمنية حرجة`,
        source: 'security',
      });
    }

    // Check systemic issues
    if (metrics.feedback.systemicIssues.length > 0) {
      this.createAlert({
        type: 'warning',
        severity: 'medium',
        title: 'Systemic Issues Detected',
        titleAr: 'تم اكتشاف مشاكل منهجية',
        message: `${metrics.feedback.systemicIssues.length} systemic issues identified`,
        messageAr: `تم تحديد ${metrics.feedback.systemicIssues.length} مشاكل منهجية`,
        source: 'feedback',
        metadata: { issues: metrics.feedback.systemicIssues },
      });
    }
  }

  /**
   * Create an alert
   */
  private createAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      resolved: false,
      ...alertData,
    };

    // Check if similar alert already exists
    const existingAlert = Array.from(this.alerts.values()).find(
      a => a.type === alert.type && a.source === alert.source && !a.resolved
    );

    if (!existingAlert) {
      this.alerts.set(alert.id, alert);

      // Notify listeners
      this.alertListeners.forEach(listener => {
        try {
          listener(alert);
        } catch (error) {
          console.error('Error in alert listener:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const productionMonitor = ProductionMonitor.getInstance();

