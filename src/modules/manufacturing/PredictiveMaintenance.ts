/**
 * Predictive Maintenance System
 * Monitors machine health and predicts maintenance needs
 */

export interface MachineHealth {
  machineId: string;
  machineName: string;
  status: 'healthy' | 'warning' | 'critical' | 'maintenance';
  healthScore: number; // 0-100
  lastMaintenance: Date;
  nextMaintenance: Date;
  operatingHours: number;
  metrics: {
    temperature: number;
    vibration: number;
    pressure: number;
    powerConsumption: number;
    errorCount: number;
  };
  alerts: MaintenanceAlert[];
}

export interface MaintenanceAlert {
  id: string;
  machineId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  recommendedAction: string;
}

export interface MaintenanceSchedule {
  id: string;
  machineId: string;
  type: 'preventive' | 'corrective' | 'emergency';
  scheduledDate: Date;
  estimatedDuration: number; // hours
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  partsRequired: string[];
}

export class PredictiveMaintenance {
  private machineHealth: Map<string, MachineHealth> = new Map();
  private maintenanceSchedules: Map<string, MaintenanceSchedule[]> = new Map();
  private alerts: Map<string, MaintenanceAlert[]> = new Map();

  /**
   * Update machine health metrics
   */
  updateMachineMetrics(
    machineId: string,
    metrics: Partial<MachineHealth['metrics']>
  ): void {
    const health = this.machineHealth.get(machineId) || this.createDefaultHealth(machineId);
    
    health.metrics = { ...health.metrics, ...metrics };
    health.healthScore = this.calculateHealthScore(health);
    health.status = this.determineStatus(health.healthScore);

    // Check for alerts
    const newAlerts = this.checkForAlerts(health);
    if (newAlerts.length > 0) {
      const existingAlerts = this.alerts.get(machineId) || [];
      existingAlerts.push(...newAlerts);
      this.alerts.set(machineId, existingAlerts);
      health.alerts = existingAlerts;
    }

    this.machineHealth.set(machineId, health);
  }

  /**
   * Get machine health
   */
  getMachineHealth(machineId: string): MachineHealth | undefined {
    return this.machineHealth.get(machineId);
  }

  /**
   * Get all machine health statuses
   */
  getAllMachineHealth(): MachineHealth[] {
    return Array.from(this.machineHealth.values());
  }

  /**
   * Predict maintenance needs
   */
  predictMaintenance(machineId: string): MaintenanceSchedule[] {
    const health = this.machineHealth.get(machineId);
    if (!health) return [];

    const schedules: MaintenanceSchedule[] = [];

    // Predict based on operating hours
    const hoursSinceMaintenance = health.operatingHours;
    const maintenanceInterval = 500; // hours

    if (hoursSinceMaintenance >= maintenanceInterval * 0.9) {
      schedules.push({
        id: `maint_${machineId}_${Date.now()}`,
        machineId,
        type: 'preventive',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        estimatedDuration: 4,
        status: 'scheduled',
        description: 'Routine preventive maintenance',
        partsRequired: ['filters', 'lubricants'],
      });
    }

    // Predict based on health score
    if (health.healthScore < 50) {
      schedules.push({
        id: `maint_${machineId}_emergency_${Date.now()}`,
        machineId,
        type: 'corrective',
        scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
        estimatedDuration: 8,
        status: 'scheduled',
        description: 'Corrective maintenance required based on health metrics',
        partsRequired: this.identifyRequiredParts(health),
      });
    }

    // Store schedules
    const existingSchedules = this.maintenanceSchedules.get(machineId) || [];
    existingSchedules.push(...schedules);
    this.maintenanceSchedules.set(machineId, existingSchedules);

    return schedules;
  }

  /**
   * Get maintenance schedules
   */
  getMaintenanceSchedules(machineId?: string): MaintenanceSchedule[] {
    if (machineId) {
      return this.maintenanceSchedules.get(machineId) || [];
    }

    return Array.from(this.maintenanceSchedules.values()).flat();
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(machineId?: string): MaintenanceAlert[] {
    if (machineId) {
      return (this.alerts.get(machineId) || []).filter((a) => !a.acknowledged);
    }

    return Array.from(this.alerts.values())
      .flat()
      .filter((a) => !a.acknowledged);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(machineId: string, alertId: string): void {
    const alerts = this.alerts.get(machineId) || [];
    const alert = alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Calculate health score
   */
  private calculateHealthScore(health: MachineHealth): number {
    const { metrics } = health;

    // Normalize metrics (0-100 scale)
    const tempScore = metrics.temperature > 80 ? 50 : 100;
    const vibrationScore = metrics.vibration > 5 ? 50 : 100;
    const pressureScore = metrics.pressure > 10 ? 50 : 100;
    const powerScore = metrics.powerConsumption > 15 ? 50 : 100;
    const errorScore = metrics.errorCount > 5 ? 30 : 100;

    // Weighted average
    return (
      tempScore * 0.2 +
      vibrationScore * 0.25 +
      pressureScore * 0.2 +
      powerScore * 0.15 +
      errorScore * 0.2
    );
  }

  /**
   * Determine status from health score
   */
  private determineStatus(score: number): MachineHealth['status'] {
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'warning';
    if (score >= 40) return 'critical';
    return 'maintenance';
  }

  /**
   * Check for alerts
   */
  private checkForAlerts(health: MachineHealth): MaintenanceAlert[] {
    const alerts: MaintenanceAlert[] = [];

    if (health.metrics.temperature > 85) {
      alerts.push({
        id: `alert_${health.machineId}_temp_${Date.now()}`,
        machineId: health.machineId,
        severity: 'warning',
        message: `High temperature detected: ${health.metrics.temperature}°C`,
        timestamp: new Date(),
        acknowledged: false,
        recommendedAction: 'Check cooling system and reduce load',
      });
    }

    if (health.metrics.vibration > 7) {
      alerts.push({
        id: `alert_${health.machineId}_vib_${Date.now()}`,
        machineId: health.machineId,
        severity: 'critical',
        message: `Excessive vibration detected: ${health.metrics.vibration}`,
        timestamp: new Date(),
        acknowledged: false,
        recommendedAction: 'Immediate inspection required',
      });
    }

    if (health.metrics.errorCount > 10) {
      alerts.push({
        id: `alert_${health.machineId}_errors_${Date.now()}`,
        machineId: health.machineId,
        severity: 'critical',
        message: `High error count: ${health.metrics.errorCount}`,
        timestamp: new Date(),
        acknowledged: false,
        recommendedAction: 'Review error logs and schedule maintenance',
      });
    }

    return alerts;
  }

  /**
   * Create default health record
   */
  private createDefaultHealth(machineId: string): MachineHealth {
    return {
      machineId,
      machineName: `Machine ${machineId}`,
      status: 'healthy',
      healthScore: 100,
      lastMaintenance: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      nextMaintenance: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days
      operatingHours: 0,
      metrics: {
        temperature: 70,
        vibration: 2,
        pressure: 5,
        powerConsumption: 10,
        errorCount: 0,
      },
      alerts: [],
    };
  }

  /**
   * Identify required parts based on health
   */
  private identifyRequiredParts(health: MachineHealth): string[] {
    const parts: string[] = [];

    if (health.metrics.temperature > 80) {
      parts.push('cooling_fan', 'thermal_paste');
    }

    if (health.metrics.vibration > 5) {
      parts.push('bearings', 'dampers');
    }

    if (health.metrics.errorCount > 5) {
      parts.push('sensors', 'control_board');
    }

    return parts;
  }
}

