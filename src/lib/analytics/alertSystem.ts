/**
 * Alert System for Performance Degradation
 * 
 * This module provides real-time monitoring and alerting capabilities
 * for performance issues, business metrics, and system health.
 */

export interface Alert {
  id: string;
  type: 'performance' | 'business' | 'security' | 'system' | 'user-experience';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
  actions?: AlertAction[];
}

export interface AlertAction {
  id: string;
  label: string;
  type: 'auto' | 'manual';
  handler: () => Promise<void>;
  executed: boolean;
  executedAt?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (data: any) => boolean;
  severity: Alert['severity'];
  type: Alert['type'];
  enabled: boolean;
  cooldown: number; // minutes
  lastTriggered?: Date;
}

export interface PerformanceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

class AlertSystem {
  private alerts: Alert[] = [];
  private rules: AlertRule[] = [];
  private thresholds: PerformanceThreshold[] = [];
  private subscribers: ((alert: Alert) => void)[] = [];
  private isMonitoring: boolean = false;

  constructor() {
    this.initializeRules();
    this.initializeThresholds();
    this.startMonitoring();
  }

  private initializeRules(): void {
    this.rules = [
      {
        id: 'high-bounce-rate',
        name: 'High Bounce Rate',
        description: 'Bounce rate exceeds 60%',
        condition: (data) => data.bounceRate > 60,
        severity: 'medium',
        type: 'user-experience',
        enabled: true,
        cooldown: 15
      },
      {
        id: 'slow-page-load',
        name: 'Slow Page Load',
        description: 'Average page load time exceeds 3 seconds',
        condition: (data) => data.pageLoadTime > 3000,
        severity: 'high',
        type: 'performance',
        enabled: true,
        cooldown: 10
      },
      {
        id: 'low-conversion-rate',
        name: 'Low Conversion Rate',
        description: 'Conversion rate drops below 2%',
        condition: (data) => data.conversionRate < 2,
        severity: 'high',
        type: 'business',
        enabled: true,
        cooldown: 30
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Error rate exceeds 5%',
        condition: (data) => data.errorRate > 5,
        severity: 'critical',
        type: 'system',
        enabled: true,
        cooldown: 5
      },
      {
        id: 'low-active-users',
        name: 'Low Active Users',
        description: 'Active users drop below expected threshold',
        condition: (data) => data.activeUsers < (data.expectedUsers * 0.7),
        severity: 'medium',
        type: 'business',
        enabled: true,
        cooldown: 60
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'Memory usage exceeds 85%',
        condition: (data) => data.memoryUsage > 85,
        severity: 'high',
        type: 'system',
        enabled: true,
        cooldown: 10
      },
      {
        id: 'database-slow-queries',
        name: 'Database Slow Queries',
        description: 'More than 10 slow queries per minute',
        condition: (data) => data.slowQueries > 10,
        severity: 'medium',
        type: 'performance',
        enabled: true,
        cooldown: 15
      },
      {
        id: 'api-response-time',
        name: 'API Response Time',
        description: 'API response time exceeds 2 seconds',
        condition: (data) => data.apiResponseTime > 2000,
        severity: 'high',
        type: 'performance',
        enabled: true,
        cooldown: 10
      }
    ];
  }

  private initializeThresholds(): void {
    this.thresholds = [
      {
        metric: 'First Contentful Paint',
        warning: 1800,
        critical: 2500,
        unit: 'ms'
      },
      {
        metric: 'Largest Contentful Paint',
        warning: 2500,
        critical: 4000,
        unit: 'ms'
      },
      {
        metric: 'Cumulative Layout Shift',
        warning: 0.1,
        critical: 0.25,
        unit: ''
      },
      {
        metric: 'First Input Delay',
        warning: 100,
        critical: 300,
        unit: 'ms'
      },
      {
        metric: 'Time to Interactive',
        warning: 3800,
        critical: 7300,
        unit: 'ms'
      },
      {
        metric: 'Bounce Rate',
        warning: 50,
        critical: 70,
        unit: '%'
      },
      {
        metric: 'Conversion Rate',
        warning: 2.5,
        critical: 1.5,
        unit: '%'
      },
      {
        metric: 'Error Rate',
        warning: 2,
        critical: 5,
        unit: '%'
      }
    ];
  }

  private startMonitoring(): void {
    this.isMonitoring = true;
    
    // Monitor performance metrics every 30 seconds
    setInterval(() => {
      this.checkPerformanceMetrics();
    }, 30000);

    // Monitor business metrics every 5 minutes
    setInterval(() => {
      this.checkBusinessMetrics();
    }, 300000);

    // Monitor system health every 10 seconds
    setInterval(() => {
      this.checkSystemHealth();
    }, 10000);
  }

  private async checkPerformanceMetrics(): Promise<void> {
    try {
      // Simulate performance data collection
      const performanceData = await this.collectPerformanceData();
      
      // Check against thresholds
      this.thresholds.forEach(threshold => {
        const value = performanceData[threshold.metric.toLowerCase().replace(/\s+/g, '_')];
        if (value !== undefined) {
          if (value >= threshold.critical) {
            this.triggerAlert({
              type: 'performance',
              severity: 'critical',
              title: `Critical: ${threshold.metric}`,
              message: `${threshold.metric} is ${value}${threshold.unit}, exceeding critical threshold of ${threshold.critical}${threshold.unit}`,
              metadata: { metric: threshold.metric, value, threshold: threshold.critical }
            });
          } else if (value >= threshold.warning) {
            this.triggerAlert({
              type: 'performance',
              severity: 'medium',
              title: `Warning: ${threshold.metric}`,
              message: `${threshold.metric} is ${value}${threshold.unit}, exceeding warning threshold of ${threshold.warning}${threshold.unit}`,
              metadata: { metric: threshold.metric, value, threshold: threshold.warning }
            });
          }
        }
      });
    } catch (error) {
      console.error('Error checking performance metrics:', error);
    }
  }

  private async checkBusinessMetrics(): Promise<void> {
    try {
      const businessData = await this.collectBusinessData();
      
      this.rules
        .filter(rule => rule.type === 'business' && rule.enabled)
        .forEach(rule => {
          if (this.canTriggerRule(rule) && rule.condition(businessData)) {
            this.triggerAlert({
              type: rule.type,
              severity: rule.severity,
              title: rule.name,
              message: rule.description,
              metadata: businessData
            });
            rule.lastTriggered = new Date();
          }
        });
    } catch (error) {
      console.error('Error checking business metrics:', error);
    }
  }

  private async checkSystemHealth(): Promise<void> {
    try {
      const systemData = await this.collectSystemData();
      
      this.rules
        .filter(rule => rule.type === 'system' && rule.enabled)
        .forEach(rule => {
          if (this.canTriggerRule(rule) && rule.condition(systemData)) {
            this.triggerAlert({
              type: rule.type,
              severity: rule.severity,
              title: rule.name,
              message: rule.description,
              metadata: systemData
            });
            rule.lastTriggered = new Date();
          }
        });
    } catch (error) {
      console.error('Error checking system health:', error);
    }
  }

  private canTriggerRule(rule: AlertRule): boolean {
    if (!rule.lastTriggered) return true;
    
    const cooldownMs = rule.cooldown * 60 * 1000;
    return Date.now() - rule.lastTriggered.getTime() > cooldownMs;
  }

  private async collectPerformanceData(): Promise<any> {
    // Simulate performance data collection
    return {
      first_contentful_paint: Math.random() * 3000,
      largest_contentful_paint: Math.random() * 4000,
      cumulative_layout_shift: Math.random() * 0.3,
      first_input_delay: Math.random() * 200,
      time_to_interactive: Math.random() * 5000,
      bounce_rate: Math.random() * 100,
      conversion_rate: Math.random() * 10,
      error_rate: Math.random() * 10
    };
  }

  private async collectBusinessData(): Promise<any> {
    // Simulate business data collection
    return {
      bounceRate: Math.random() * 100,
      conversionRate: Math.random() * 10,
      activeUsers: Math.floor(Math.random() * 5000),
      expectedUsers: 3000,
      revenue: Math.random() * 100000
    };
  }

  private async collectSystemData(): Promise<any> {
    // Simulate system data collection
    return {
      memoryUsage: Math.random() * 100,
      cpuUsage: Math.random() * 100,
      errorRate: Math.random() * 10,
      slowQueries: Math.floor(Math.random() * 20),
      apiResponseTime: Math.random() * 3000
    };
  }

  private triggerAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    const alert: Alert = {
      ...alertData,
      id: this.generateAlertId(),
      timestamp: new Date(),
      resolved: false,
      actions: this.getDefaultActions(alertData.type, alertData.severity)
    };

    this.alerts.unshift(alert); // Add to beginning of array
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    // Notify subscribers
    this.subscribers.forEach(subscriber => {
      try {
        subscriber(alert);
      } catch (error) {
        console.error('Error notifying alert subscriber:', error);
      }
    });

    // Auto-resolve low severity alerts after 1 hour
    if (alert.severity === 'low') {
      setTimeout(() => {
        this.resolveAlert(alert.id);
      }, 60 * 60 * 1000);
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultActions(type: Alert['type'], severity: Alert['severity']): AlertAction[] {
    const actions: AlertAction[] = [];

    if (severity === 'critical' || severity === 'high') {
      actions.push({
        id: 'notify-team',
        label: 'Notify Team',
        type: 'auto',
        handler: async () => {
          console.log('Notifying team about critical alert');
          // Implement team notification logic
        },
        executed: false
      });
    }

    if (type === 'performance') {
      actions.push({
        id: 'clear-cache',
        label: 'Clear Cache',
        type: 'auto',
        handler: async () => {
          console.log('Clearing application cache');
          // Implement cache clearing logic
        },
        executed: false
      });
    }

    if (type === 'system') {
      actions.push({
        id: 'restart-service',
        label: 'Restart Service',
        type: 'manual',
        handler: async () => {
          console.log('Restarting service');
          // Implement service restart logic
        },
        executed: false
      });
    }

    return actions;
  }

  // Public API Methods
  public getAlerts(limit: number = 50): Alert[] {
    return this.alerts.slice(0, limit);
  }

  public getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  public getAlertsBySeverity(severity: Alert['severity']): Alert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  public getAlertsByType(type: Alert['type']): Alert[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      return true;
    }
    return false;
  }

  public executeAction(alertId: string, actionId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return Promise.resolve(false);

    const action = alert.actions?.find(a => a.id === actionId);
    if (!action) return Promise.resolve(false);

    return action.handler()
      .then(() => {
        action.executed = true;
        action.executedAt = new Date();
        return true;
      })
      .catch(error => {
        console.error('Error executing alert action:', error);
        return false;
      });
  }

  public subscribe(callback: (alert: Alert) => void): () => void {
    this.subscribers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  public addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  public updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      Object.assign(rule, updates);
      return true;
    }
    return false;
  }

  public deleteRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index > -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  public getRules(): AlertRule[] {
    return this.rules;
  }

  public getThresholds(): PerformanceThreshold[] {
    return this.thresholds;
  }

  public updateThreshold(metric: string, updates: Partial<PerformanceThreshold>): boolean {
    const threshold = this.thresholds.find(t => t.metric === metric);
    if (threshold) {
      Object.assign(threshold, updates);
      return true;
    }
    return false;
  }

  public getAlertStats(): {
    total: number;
    active: number;
    resolved: number;
    bySeverity: Record<Alert['severity'], number>;
    byType: Record<Alert['type'], number>;
  } {
    const stats = {
      total: this.alerts.length,
      active: this.getActiveAlerts().length,
      resolved: this.alerts.filter(a => a.resolved).length,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      } as Record<Alert['severity'], number>,
      byType: {
        performance: 0,
        business: 0,
        security: 0,
        system: 0,
        'user-experience': 0
      } as Record<Alert['type'], number>
    };

    this.alerts.forEach(alert => {
      stats.bySeverity[alert.severity]++;
      stats.byType[alert.type]++;
    });

    return stats;
  }

  public exportAlerts(): string {
    return JSON.stringify({
      alerts: this.alerts,
      rules: this.rules,
      thresholds: this.thresholds,
      stats: this.getAlertStats(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

// Export singleton instance
export const alertSystem = new AlertSystem();

// Export utility functions
export const getSeverityColor = (severity: Alert['severity']): string => {
  switch (severity) {
    case 'low': return 'text-blue-600';
    case 'medium': return 'text-yellow-600';
    case 'high': return 'text-amber-600';
    case 'critical': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

export const getSeverityIcon = (severity: Alert['severity']): string => {
  switch (severity) {
    case 'low': return 'ℹ️';
    case 'medium': return '⚠️';
    case 'high': return '🚨';
    case 'critical': return '🔥';
    default: return '📋';
  }
};

export const formatAlertTime = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};
