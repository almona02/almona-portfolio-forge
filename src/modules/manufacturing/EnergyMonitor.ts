/**
 * Energy Consumption Monitoring System
 * Tracks and optimizes energy usage
 */

export interface EnergyReading {
  timestamp: Date;
  machineId: string;
  powerConsumption: number; // kW
  voltage: number; // V
  current: number; // A
  powerFactor: number;
  energyConsumed: number; // kWh
}

export interface EnergyReport {
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  totalEnergy: number; // kWh
  averagePower: number; // kW
  peakPower: number; // kW
  cost: number; // EUR
  byMachine: Record<string, {
    totalEnergy: number;
    averagePower: number;
    cost: number;
  }>;
  efficiency: number; // 0-100
}

export interface EnergyOptimization {
  machineId: string;
  currentConsumption: number;
  optimizedConsumption: number;
  savings: number;
  recommendations: string[];
}

export class EnergyMonitor {
  private readings: Map<string, EnergyReading[]> = new Map();
  private energyPrice: number = 0.15; // EUR per kWh

  /**
   * Record energy reading
   */
  recordReading(reading: EnergyReading): void {
    const machineReadings = this.readings.get(reading.machineId) || [];
    machineReadings.push(reading);
    this.readings.set(reading.machineId, machineReadings);
  }

  /**
   * Get energy readings for machine
   */
  getReadings(machineId: string, startDate?: Date, endDate?: Date): EnergyReading[] {
    const readings = this.readings.get(machineId) || [];

    if (startDate && endDate) {
      return readings.filter(
        (r) => r.timestamp >= startDate && r.timestamp <= endDate
      );
    }

    return readings;
  }

  /**
   * Generate energy report
   */
  generateReport(
    period: EnergyReport['period'],
    startDate: Date,
    endDate?: Date
  ): EnergyReport {
    const actualEndDate = endDate || new Date();
    const allReadings = Array.from(this.readings.values()).flat();

    // Filter readings by period
    const periodReadings = allReadings.filter(
      (r) => r.timestamp >= startDate && r.timestamp <= actualEndDate
    );

    const totalEnergy = periodReadings.reduce(
      (sum, r) => sum + r.energyConsumed,
      0
    );
    const averagePower =
      periodReadings.length > 0
        ? periodReadings.reduce((sum, r) => sum + r.powerConsumption, 0) /
          periodReadings.length
        : 0;
    const peakPower = Math.max(
      ...periodReadings.map((r) => r.powerConsumption),
      0
    );

    // Group by machine
    const byMachine: EnergyReport['byMachine'] = {};
    const machineIds = new Set(periodReadings.map((r) => r.machineId));

    for (const machineId of machineIds) {
      const machineReadings = periodReadings.filter(
        (r) => r.machineId === machineId
      );
      const machineEnergy = machineReadings.reduce(
        (sum, r) => sum + r.energyConsumed,
        0
      );
      const machineAvgPower =
        machineReadings.length > 0
          ? machineReadings.reduce((sum, r) => sum + r.powerConsumption, 0) /
            machineReadings.length
          : 0;

      byMachine[machineId] = {
        totalEnergy: machineEnergy,
        averagePower: machineAvgPower,
        cost: machineEnergy * this.energyPrice,
      };
    }

    const cost = totalEnergy * this.energyPrice;
    const efficiency = this.calculateEfficiency(periodReadings);

    return {
      period,
      startDate,
      endDate: actualEndDate,
      totalEnergy,
      averagePower,
      peakPower,
      cost,
      byMachine,
      efficiency,
    };
  }

  /**
   * Optimize energy consumption
   */
  optimizeEnergy(machineId: string): EnergyOptimization {
    const readings = this.getReadings(machineId);
    if (readings.length === 0) {
      return {
        machineId,
        currentConsumption: 0,
        optimizedConsumption: 0,
        savings: 0,
        recommendations: ['No data available for optimization'],
      };
    }

    const recentReadings = readings.slice(-100); // Last 100 readings
    const currentConsumption =
      recentReadings.reduce((sum, r) => sum + r.powerConsumption, 0) /
      recentReadings.length;

    // Optimization strategies
    const recommendations: string[] = [];
    let optimizedConsumption = currentConsumption;

    // Reduce idle time
    const idleReadings = recentReadings.filter((r) => r.powerConsumption < 1);
    if (idleReadings.length > recentReadings.length * 0.3) {
      recommendations.push('Reduce machine idle time by 30%');
      optimizedConsumption *= 0.95;
    }

    // Improve power factor
    const avgPowerFactor =
      recentReadings.reduce((sum, r) => sum + r.powerFactor, 0) /
      recentReadings.length;
    if (avgPowerFactor < 0.9) {
      recommendations.push('Install power factor correction equipment');
      optimizedConsumption *= 0.92;
    }

    // Schedule maintenance
    const highConsumptionReadings = recentReadings.filter(
      (r) => r.powerConsumption > currentConsumption * 1.2
    );
    if (highConsumptionReadings.length > 0) {
      recommendations.push('Schedule maintenance to improve efficiency');
      optimizedConsumption *= 0.95;
    }

    const savings = (currentConsumption - optimizedConsumption) * 24 * 30 * this.energyPrice; // Monthly savings

    return {
      machineId,
      currentConsumption,
      optimizedConsumption,
      savings,
      recommendations: recommendations.length > 0
        ? recommendations
        : ['Energy consumption is already optimized'],
    };
  }

  /**
   * Calculate efficiency
   */
  private calculateEfficiency(readings: EnergyReading[]): number {
    if (readings.length === 0) return 0;

    // Calculate average power factor
    const avgPowerFactor =
      readings.reduce((sum, r) => sum + r.powerFactor, 0) / readings.length;

    // Calculate load factor (actual vs peak)
    const avgPower =
      readings.reduce((sum, r) => sum + r.powerConsumption, 0) /
      readings.length;
    const peakPower = Math.max(...readings.map((r) => r.powerConsumption));
    const loadFactor = peakPower > 0 ? avgPower / peakPower : 0;

    // Efficiency = power factor * load factor * 100
    return avgPowerFactor * loadFactor * 100;
  }

  /**
   * Get energy consumption trends
   */
  getTrends(machineId: string, days: number = 7): {
    date: string;
    energy: number;
    cost: number;
  }[] {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const readings = this.getReadings(machineId, startDate, endDate);

    // Group by day
    const dailyData = new Map<string, { energy: number; cost: number }>();

    for (const reading of readings) {
      const dateKey = reading.timestamp.toISOString().split('T')[0];
      const existing = dailyData.get(dateKey) || { energy: 0, cost: 0 };

      existing.energy += reading.energyConsumed;
      existing.cost += reading.energyConsumed * this.energyPrice;

      dailyData.set(dateKey, existing);
    }

    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date,
        energy: data.energy,
        cost: data.cost,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Set energy price
   */
  setEnergyPrice(price: number): void {
    this.energyPrice = price;
  }
}

