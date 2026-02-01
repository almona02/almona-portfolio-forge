/**
 * @tier Tier 1 (Testing/Simulation Only)
 * @constitutional_compliance AICS-001 §8 (Testing Infrastructure)
 * @authority None - Simulation only, feeds into Tier 3 rules
 * 
 * GOVERNANCE:
 * - This is a SIMULATOR for testing and demos
 * - Generates realistic telemetry data based on Egyptian environmental patterns
 * - Output feeds into YilmazEgyptRulesEngine (Tier 3) for advisory generation
 * - Does NOT bypass constitutional governance
 * - Does NOT make autonomous recommendations
 * 
 * PURPOSE:
 * - Test the advisory system without real sensors ($0 hardware budget)
 * - Demo the system to customers
 * - Train technicians on expected patterns
 * - Validate rules against simulated Egyptian conditions
 */

import { 
  YilmazTechnicianInput, 
  YilmazMachineModel,
  EGYPT_ENV_CONSTANTS 
} from '../rules/YilmazEgyptRules';

/**
 * Simulated Machine Configuration
 */
interface SimulatedMachine {
  machineId: string;
  machineSerial: string;
  machineModel: YilmazMachineModel;
  installationYear: number;
  location: 'cairo' | 'giza' | 'alexandria' | 'suez' | 'port_said' | 'other';
  customer: string;
  operatingHoursBase: number; // Base operating hours for this machine
}

/**
 * Simulated Telemetry Reading
 */
export interface YilmazSimulatedTelemetry {
  // Machine Identity
  machineId: string;
  machineSerial: string;
  machineModel: YilmazMachineModel;
  customer: string;
  location: string;
  
  // Timestamp
  timestamp: string;
  
  // Simulated Sensor Readings
  hydraulicPressureBar: number;
  spindleTempCelsius: number;
  inputVoltage: number;
  dustLevel: number; // 1-5
  ambientTempCelsius: number;
  operatingHours: number;
  
  // Environmental Context
  currentMonth: number;
  isKhamsinSeason: boolean;
  isSummer: boolean;
  isBusinessHours: boolean;
  
  // Simulated Symptoms (based on readings)
  symptoms: string[];
  
  // Simulation Metadata
  simulationNote: string;
}

/**
 * YILMAZ Telemetry Simulator
 * 
 * Generates realistic telemetry data for YILMAZ machines in Egypt based on:
 * - Time of day (business hours vs. off-hours)
 * - Season (Khamsin dust storms, summer heat)
 * - Egyptian grid patterns (voltage fluctuations)
 * - Machine age and operating hours
 * - Location (Cairo, Alexandria, etc.)
 */
export class YilmazTelemetrySimulator {
  
  private readonly machines: SimulatedMachine[] = [
    {
      machineId: 'YILMAZ-AIM-4410-2019',
      machineSerial: 'YIL-2019-07812',
      machineModel: 'AIM_4410',
      installationYear: 2019,
      location: 'cairo',
      customer: 'MetalWorks Egypt',
      operatingHoursBase: 18500 // ~5 years at 10h/day
    },
    {
      machineId: 'YILMAZ-AIM-7510-2020',
      machineSerial: 'YIL-2020-05234',
      machineModel: 'AIM_7510',
      installationYear: 2020,
      location: 'alexandria',
      customer: 'Precision Aluminum',
      operatingHoursBase: 14600 // ~4 years at 10h/day
    },
    {
      machineId: 'YILMAZ-ALM-6510-2024',
      machineSerial: 'YIL-2024-01103',
      machineModel: 'ALM_6510',
      installationYear: 2024,
      location: 'giza',
      customer: 'Modern Windows',
      operatingHoursBase: 1800 // New machine, <1 year
    }
  ];

  /**
   * Generate simulated telemetry for a machine
   */
  generateTelemetry(machineIdOrSerial: string, options?: {
    forceKhamsin?: boolean;
    forceSummer?: boolean;
    forceVoltageIssue?: boolean;
    forceOverheating?: boolean;
  }): YilmazSimulatedTelemetry {
    const machine = this.findMachine(machineIdOrSerial);
    if (!machine) {
      throw new Error(`Machine not found: ${machineIdOrSerial}`);
    }

    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();

    // Environmental context
    const isBusinessHours = hour >= 8 && hour <= 17;
    const isKhamsinSeason = options?.forceKhamsin ?? (month >= EGYPT_ENV_CONSTANTS.KHAMSIN_SEASON_START && month <= EGYPT_ENV_CONSTANTS.KHAMSIN_SEASON_END);
    const isSummer = options?.forceSummer ?? (month >= 5 && month <= 8); // June-September

    // Simulate sensor readings
    const hydraulicPressureBar = this.simulateHydraulicPressure(machine, isBusinessHours);
    const spindleTempCelsius = this.simulateSpindleTemp(machine, isSummer, isBusinessHours, options?.forceOverheating);
    const inputVoltage = this.simulateInputVoltage(hour, machine.location, options?.forceVoltageIssue);
    const dustLevel = this.simulateDustLevel(isKhamsinSeason, machine.location);
    const ambientTempCelsius = this.simulateAmbientTemp(isSummer, hour, machine.location);
    const operatingHours = this.simulateOperatingHours(machine, isBusinessHours);

    // Simulate symptoms based on readings
    const symptoms = this.generateSymptoms(
      hydraulicPressureBar,
      spindleTempCelsius,
      inputVoltage,
      dustLevel,
      ambientTempCelsius,
      isKhamsinSeason,
      isSummer
    );

    // Simulation note
    const simulationNote = this.generateSimulationNote(isKhamsinSeason, isSummer, options);

    return {
      machineId: machine.machineId,
      machineSerial: machine.machineSerial,
      machineModel: machine.machineModel,
      customer: machine.customer,
      location: machine.location,
      timestamp: now.toISOString(),
      hydraulicPressureBar,
      spindleTempCelsius,
      inputVoltage,
      dustLevel,
      ambientTempCelsius,
      operatingHours,
      currentMonth: month,
      isKhamsinSeason,
      isSummer,
      isBusinessHours,
      symptoms,
      simulationNote
    };
  }

  /**
   * Convert simulated telemetry to technician input format
   * (For feeding into YilmazEgyptRulesEngine)
   */
  toTechnicianInput(telemetry: YilmazSimulatedTelemetry): YilmazTechnicianInput {
    return {
      machineModel: telemetry.machineModel,
      machineSerial: telemetry.machineSerial,
      installationYear: this.findMachine(telemetry.machineSerial)?.installationYear || new Date().getFullYear(),
      hydraulicPressureBar: telemetry.hydraulicPressureBar,
      spindleTempCelsius: telemetry.spindleTempCelsius,
      inputVoltage: telemetry.inputVoltage,
      dustLevel: telemetry.dustLevel,
      ambientTempCelsius: telemetry.ambientTempCelsius,
      symptoms: telemetry.symptoms,
      currentMonth: telemetry.currentMonth,
      location: telemetry.location as any,
      operatingHours: telemetry.operatingHours
    };
  }

  /**
   * Generate telemetry for all machines
   */
  generateAllMachines(options?: {
    forceKhamsin?: boolean;
    forceSummer?: boolean;
  }): YilmazSimulatedTelemetry[] {
    return this.machines.map(machine => 
      this.generateTelemetry(machine.machineSerial, options)
    );
  }

  /**
   * Get list of simulated machines
   */
  getMachines(): SimulatedMachine[] {
    return [...this.machines];
  }

  // ========== Private Simulation Methods ==========

  private findMachine(idOrSerial: string): SimulatedMachine | undefined {
    return this.machines.find(m => 
      m.machineId === idOrSerial || m.machineSerial === idOrSerial
    );
  }

  private simulateHydraulicPressure(machine: SimulatedMachine, isBusinessHours: boolean): number {
    // Normal: 140-160 bar
    // Older machines may have slight pressure drop
    const ageYears = new Date().getFullYear() - machine.installationYear;
    const ageFactor = Math.max(0, ageYears * 2); // -2 bar per year
    
    const baselinePressure = 150 - ageFactor;
    const variation = isBusinessHours ? this.randomBetween(-5, 5) : this.randomBetween(-2, 2);
    
    return Math.round(baselinePressure + variation);
  }

  private simulateSpindleTemp(machine: SimulatedMachine, isSummer: boolean, isBusinessHours: boolean, forceOverheating?: boolean): number {
    // Normal: <70°C
    // Summer: Higher due to ambient
    // Business hours: Higher due to operation
    let baseTemp = 55;
    
    if (isSummer) baseTemp += 15;
    if (isBusinessHours) baseTemp += 10;
    if (forceOverheating) baseTemp += 20;
    
    const variation = this.randomBetween(-3, 5);
    return Math.round(baseTemp + variation);
  }

  private simulateInputVoltage(hour: number, location: string, forceIssue?: boolean): number {
    // Egypt grid: 220V nominal, but unstable
    // Peak hours (12-15, 19-22): More instability
    const isPeakHours = (hour >= 12 && hour <= 15) || (hour >= 19 && hour <= 22);
    
    if (forceIssue) {
      return this.randomBetween(190, 200); // Force low voltage
    }
    
    let voltage = EGYPT_ENV_CONSTANTS.VOLTAGE_NOMINAL;
    
    if (isPeakHours) {
      // More fluctuation during peak hours
      voltage += this.randomBetween(-15, 10);
    } else {
      voltage += this.randomBetween(-5, 5);
    }
    
    // Coastal areas (Alexandria, Port Said) slightly more stable
    if (location === 'alexandria' || location === 'port_said') {
      voltage = Math.min(voltage + 5, EGYPT_ENV_CONSTANTS.VOLTAGE_MAX);
    }
    
    return Math.round(voltage);
  }

  private simulateDustLevel(isKhamsinSeason: boolean, location: string): number {
    // Scale 1-5
    // Khamsin season: Much higher
    // Cairo/Giza: More dust than coastal areas
    let dustLevel = 1;
    
    if (isKhamsinSeason) {
      dustLevel = this.randomBetween(3, 5); // Heavy dust
    } else {
      dustLevel = this.randomBetween(1, 3); // Normal dust
    }
    
    // Coastal areas have less dust
    if (location === 'alexandria' || location === 'port_said') {
      dustLevel = Math.max(1, dustLevel - 1);
    }
    
    return dustLevel;
  }

  private simulateAmbientTemp(isSummer: boolean, hour: number, location: string): number {
    // Egyptian temperatures
    let baseTemp = 25; // Spring/Fall baseline
    
    if (isSummer) {
      baseTemp = 35; // Summer baseline
      
      // Peak heat: 12-16h
      if (hour >= 12 && hour <= 16) {
        baseTemp += 8;
      }
    }
    
    // Coastal areas (Alexandria) are cooler
    if (location === 'alexandria' || location === 'port_said') {
      baseTemp -= 5;
    }
    
    const variation = this.randomBetween(-2, 3);
    return Math.round(baseTemp + variation);
  }

  private simulateOperatingHours(machine: SimulatedMachine, isBusinessHours: boolean): number {
    // Add hours based on time since installation
    const daysSinceInstallation = Math.floor((Date.now() - new Date(machine.installationYear, 0, 1).getTime()) / (1000 * 60 * 60 * 24));
    const additionalHours = Math.floor(daysSinceInstallation * 0.4); // ~10h/day average
    
    return machine.operatingHoursBase + additionalHours + (isBusinessHours ? this.randomBetween(0, 2) : 0);
  }

  private generateSymptoms(
    hydraulicPressure: number,
    spindleTemp: number,
    voltage: number,
    dustLevel: number,
    ambientTemp: number,
    isKhamsinSeason: boolean,
    isSummer: boolean
  ): string[] {
    const symptoms: string[] = [];

    // Low hydraulic pressure
    if (hydraulicPressure < 120) {
      symptoms.push('low hydraulic pressure');
      symptoms.push('weak clamping force');
    }

    // High spindle temperature
    if (spindleTemp > 75) {
      symptoms.push('spindle overheating');
      symptoms.push('thermal shutdown');
    } else if (spindleTemp > 70) {
      symptoms.push('elevated spindle temperature');
    }

    // Voltage issues
    if (voltage < EGYPT_ENV_CONSTANTS.VOLTAGE_MIN) {
      symptoms.push('voltage fluctuation');
      symptoms.push('positioning drift');
      symptoms.push('servo error codes');
    } else if (voltage > EGYPT_ENV_CONSTANTS.VOLTAGE_MAX) {
      symptoms.push('voltage surge detected');
      symptoms.push('circuit breaker tripped');
    }

    // Dust issues
    if (dustLevel >= EGYPT_ENV_CONSTANTS.DUST_LEVEL_WARNING) {
      symptoms.push('dust accumulation in cabinet');
      symptoms.push('fan noise increase');
      if (isKhamsinSeason) {
        symptoms.push('Khamsin dust infiltration');
      }
    }

    // Summer heat issues
    if (isSummer && ambientTemp > EGYPT_ENV_CONSTANTS.SUMMER_TEMP_THRESHOLD) {
      symptoms.push('ambient temperature high');
      symptoms.push('cooling system stressed');
    }

    return symptoms;
  }

  private generateSimulationNote(isKhamsinSeason: boolean, isSummer: boolean, options?: any): string {
    const notes: string[] = ['SIMULATED DATA'];
    
    if (isKhamsinSeason) notes.push('Khamsin Season Active');
    if (isSummer) notes.push('Summer Heat Active');
    if (options?.forceVoltageIssue) notes.push('Forced Voltage Issue');
    if (options?.forceOverheating) notes.push('Forced Overheating');
    
    return notes.join(' | ');
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

/**
 * Singleton instance
 */
export const yilmazTelemetrySimulator = new YilmazTelemetrySimulator();
