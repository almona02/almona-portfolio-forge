/**
 * Abstract base class for CNC machine controllers
 * Provides common interface for all CNC machine types
 */

import { CuttingPlan, Cut, Profile } from '@/types/fabricator';

export interface MachineStatus {
  status: 'idle' | 'running' | 'paused' | 'error' | 'maintenance';
  currentOperation?: string;
  progress: number; // 0-100
  errorCode?: string;
  errorMessage?: string;
  temperature?: number;
  spindleSpeed?: number;
  feedRate?: number;
  toolNumber?: number;
  lastUpdate: Date;
}

export interface GCodeCommand {
  command: string;
  parameters: Record<string, number | string>;
  lineNumber: number;
}

export interface ToolPath {
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
  feedRate: number;
  spindleSpeed: number;
  toolNumber: number;
  operation: 'cut' | 'drill' | 'mill' | 'engrave';
}

export interface MachineCapabilities {
  maxLength: number;
  maxWidth: number;
  maxHeight: number;
  supportedMaterials: string[];
  supportedAngles: number[];
  minCutLength: number;
  maxCutLength: number;
  precision: number; // in mm
  cuttingSpeed: number; // mm/min
  supportedProfiles: string[];
}

export interface OptimizationOptions {
  minimizeWaste: boolean;
  minimizeTime: boolean;
  minimizeEnergy: boolean;
  prioritizeQuality: boolean;
  allowRemnantUsage: boolean;
}

export abstract class CNCController {
  protected machineId: string;
  protected machineName: string;
  protected capabilities: MachineCapabilities;
  protected currentStatus: MachineStatus;
  protected connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';

  constructor(machineId: string, machineName: string, capabilities: MachineCapabilities) {
    this.machineId = machineId;
    this.machineName = machineName;
    this.capabilities = capabilities;
    this.connectionStatus = 'disconnected';
    this.currentStatus = {
      status: 'idle',
      progress: 0,
      lastUpdate: new Date(),
    };
  }

  /**
   * Connect to the CNC machine
   */
  abstract connect(): Promise<boolean>;

  /**
   * Disconnect from the CNC machine
   */
  abstract disconnect(): Promise<boolean>;

  /**
   * Get current machine status
   */
  abstract getStatus(): Promise<MachineStatus>;

  /**
   * Generate G-code from cutting plan
   */
  abstract generateGCode(
    cuttingPlan: CuttingPlan[],
    options?: OptimizationOptions
  ): Promise<GCodeCommand[]>;

  /**
   * Optimize tool path for efficiency
   */
  abstract optimizeToolPath(
    cuts: Cut[],
    profile: Profile,
    options?: OptimizationOptions
  ): Promise<ToolPath[]>;

  /**
   * Send G-code to machine
   */
  abstract sendGCode(commands: GCodeCommand[]): Promise<boolean>;

  /**
   * Start machine operation
   */
  abstract startOperation(operationId: string): Promise<boolean>;

  /**
   * Pause current operation
   */
  abstract pauseOperation(): Promise<boolean>;

  /**
   * Resume paused operation
   */
  abstract resumeOperation(): Promise<boolean>;

  /**
   * Stop current operation
   */
  abstract stopOperation(): Promise<boolean>;

  /**
   * Handle machine errors and attempt recovery
   */
  abstract handleError(errorCode: string, errorMessage: string): Promise<boolean>;

  /**
   * Check if machine can handle the cutting plan
   */
  canHandleCuttingPlan(cuttingPlan: CuttingPlan[]): boolean {
    for (const plan of cuttingPlan) {
      // Check if material is supported
      if (!this.capabilities.supportedMaterials.includes(plan.profile.material.toLowerCase())) {
        return false;
      }

      // Check if profile type is supported
      if (
        this.capabilities.supportedProfiles.length > 0 &&
        !this.capabilities.supportedProfiles.includes(plan.profile.name)
      ) {
        return false;
      }

      // Check if cuts are within machine limits
      for (const cut of plan.cuts) {
        if (cut.length < this.capabilities.minCutLength) {
          return false;
        }
        if (cut.length > this.capabilities.maxCutLength) {
          return false;
        }
        if (!this.capabilities.supportedAngles.includes(cut.angle)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get machine capabilities
   */
  getCapabilities(): MachineCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    return this.connectionStatus;
  }

  /**
   * Subscribe to status updates
   */
  abstract subscribeToStatusUpdates(
    callback: (status: MachineStatus) => void
  ): () => void; // Returns unsubscribe function

  /**
   * Calculate estimated production time
   */
  abstract estimateProductionTime(cuttingPlan: CuttingPlan[]): number; // in minutes

  /**
   * Calculate energy consumption
   */
  abstract estimateEnergyConsumption(cuttingPlan: CuttingPlan[]): number; // in kWh
}

