/**
 * Yilmaz CNC Controller
 * Complete implementation of CNCController for Yilmaz machines
 * Integrates G-code generation, network protocol, and machine validation
 */

import { CNCController, MachineStatus, GCodeCommand, ToolPath, MachineCapabilities, OptimizationOptions } from '@/integrations/cnc/CNCController';
import { CuttingPlan, Cut, Profile } from '@/types/fabricator';
import { YilmazNetworkProtocol, YilmazNetworkConfig } from '@/machine-connectors/YilmazNetworkProtocol';
import { YilmazGCodeGenerator, YilmazMachineModel, MACHINE_SPECS } from './YilmazGCodeGenerator';
import { MachineValidator, ValidationResult } from './MachineValidator';

export class YilmazCNC extends CNCController {
  private networkProtocol: YilmazNetworkProtocol;
  private gCodeGenerator: YilmazGCodeGenerator;
  private validator: MachineValidator;
  private machineModel: YilmazMachineModel;
  private statusCallbacks: Set<(status: MachineStatus) => void> = new Set();
  private statusUpdateInterval?: NodeJS.Timeout;

  constructor(
    machineId: string,
    machineName: string,
    machineModel: YilmazMachineModel,
    networkConfig: YilmazNetworkConfig
  ) {
    const specs = MACHINE_SPECS[machineModel];
    const capabilities: MachineCapabilities = {
      maxLength: specs.maxLength,
      maxWidth: specs.maxWidth,
      maxHeight: specs.maxHeight,
      supportedMaterials: ['aluminum', 'alüminyum', 'upvc', 'pvc', 'wood', 'ahşap'],
      supportedAngles: specs.supportedAngles,
      minCutLength: specs.minCutLength,
      maxCutLength: specs.maxCutLength,
      precision: specs.precision,
      cuttingSpeed: specs.maxFeedRate,
      supportedProfiles: [] // All profiles supported
    };

    super(machineId, machineName, capabilities);

    this.machineModel = machineModel;
    this.networkProtocol = new YilmazNetworkProtocol(networkConfig);
    this.gCodeGenerator = new YilmazGCodeGenerator(machineModel);
    this.validator = new MachineValidator(machineModel);
  }

  /**
   * Connect to Yilmaz machine
   */
  async connect(): Promise<boolean> {
    try {
      this.connectionStatus = 'connecting';
      const connected = await this.networkProtocol.connect();
      
      if (connected) {
        this.connectionStatus = 'connected';
        
        // Subscribe to status updates
        this.networkProtocol.subscribeToStatus((status) => {
          this.updateMachineStatus(status);
        });

        // Start periodic status polling
        this.startStatusPolling();
        
        return true;
      } else {
        this.connectionStatus = 'error';
        return false;
      }
    } catch (error) {
      console.error('Failed to connect to Yilmaz machine:', error);
      this.connectionStatus = 'error';
      return false;
    }
  }

  /**
   * Disconnect from machine
   */
  async disconnect(): Promise<boolean> {
    this.stopStatusPolling();
    const disconnected = await this.networkProtocol.disconnect();
    this.connectionStatus = disconnected ? 'disconnected' : 'error';
    return disconnected;
  }

  /**
   * Get current machine status
   */
  async getStatus(): Promise<MachineStatus> {
    try {
      const status = await this.networkProtocol.requestStatus();
      this.updateMachineStatus(status);
      return this.currentStatus;
    } catch (error) {
      console.error('Failed to get machine status:', error);
      return this.currentStatus;
    }
  }

  /**
   * Generate G-code from cutting plan
   */
  async generateGCode(
    cuttingPlan: CuttingPlan[],
    options?: OptimizationOptions
  ): Promise<GCodeCommand[]> {
    // Validate cutting plan first
    const validation = this.validator.validateCuttingPlan(cuttingPlan);
    
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => e.message).join('; ');
      throw new Error(`Cutting plan validation failed: ${errorMessages}`);
    }

    // Apply optimization options to G-code generator
    const gCodeOptions = {
      optimizeToolChanges: options?.minimizeTime ?? true,
      minimizeWaste: options?.minimizeWaste ?? true,
      safetyZones: true,
      includeComments: true,
      coordinateSystem: 'absolute' as const,
      units: 'mm' as const
    };

    this.gCodeGenerator = new YilmazGCodeGenerator(this.machineModel, gCodeOptions);
    
    return this.gCodeGenerator.generateGCode(cuttingPlan);
  }

  /**
   * Optimize tool path for efficiency
   */
  async optimizeToolPath(
    cuts: Cut[],
    profile: Profile,
    options?: OptimizationOptions
  ): Promise<ToolPath[]> {
    // Create a temporary cutting plan for optimization
    const tempPlan: CuttingPlan = {
      profile,
      stockLength: 6000, // Default stock length
      cuts,
      totalWaste: 0,
      utilization: 0
    };

    // Generate G-code to get tool paths
    const gCodeCommands = await this.generateGCode([tempPlan], options);
    
    // Convert G-code commands to tool paths
    // This is a simplified conversion - real implementation would parse G-code more carefully
    const toolPaths: ToolPath[] = [];
    let currentTool = 1;
    let currentPosition = { x: 0, y: 0, z: 0 };

    gCodeCommands.forEach((cmd) => {
      if (cmd.command === 'M6' && cmd.parameters.T) {
        currentTool = cmd.parameters.T as number;
      } else if (cmd.command === 'G1' || cmd.command === 'G0') {
        const endPoint = {
          x: (cmd.parameters.X as number) ?? currentPosition.x,
          y: (cmd.parameters.Y as number) ?? currentPosition.y,
          z: (cmd.parameters.Z as number) ?? currentPosition.z
        };

        if (cmd.command === 'G1') {
          toolPaths.push({
            startPoint: { ...currentPosition },
            endPoint,
            feedRate: (cmd.parameters.F as number) ?? 3000,
            spindleSpeed: 18000, // Default, would be extracted from M3 command
            toolNumber: currentTool,
            operation: 'cut'
          });
        }

        currentPosition = endPoint;
      }
    });

    return toolPaths;
  }

  /**
   * Send G-code to machine
   */
  async sendGCode(commands: GCodeCommand[]): Promise<boolean> {
    try {
      // Convert G-code commands to string
      const gCodeString = YilmazGCodeGenerator.commandsToString(commands);
      
      // Upload to machine via network protocol
      const filename = `program_${Date.now()}.nc`;
      const success = await this.networkProtocol.uploadCuttingList(
        Buffer.from(gCodeString, 'utf8'),
        filename
      );

      return success;
    } catch (error) {
      console.error('Failed to send G-code to machine:', error);
      return false;
    }
  }

  /**
   * Start machine operation
   */
  async startOperation(operationId: string): Promise<boolean> {
    return await this.networkProtocol.startOperation(operationId);
  }

  /**
   * Pause current operation
   */
  async pauseOperation(): Promise<boolean> {
    return await this.networkProtocol.pauseOperation();
  }

  /**
   * Resume paused operation
   */
  async resumeOperation(): Promise<boolean> {
    return await this.networkProtocol.resumeOperation();
  }

  /**
   * Stop current operation
   */
  async stopOperation(): Promise<boolean> {
    return await this.networkProtocol.stopOperation();
  }

  /**
   * Handle machine errors
   */
  async handleError(errorCode: string, errorMessage: string): Promise<boolean> {
    console.error(`Machine error ${errorCode}: ${errorMessage}`);
    
    // Update status
    this.currentStatus = {
      ...this.currentStatus,
      status: 'error',
      errorCode,
      errorMessage,
      lastUpdate: new Date()
    };

    // Notify callbacks
    this.statusCallbacks.forEach(callback => callback(this.currentStatus));

    // Attempt recovery based on error code
    if (errorCode.startsWith('E_')) {
      // Emergency stop - requires manual intervention
      return false;
    } else if (errorCode.startsWith('W_')) {
      // Warning - can attempt auto-recovery
      return true;
    }

    return false;
  }

  /**
   * Subscribe to status updates
   */
  subscribeToStatusUpdates(callback: (status: MachineStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  /**
   * Estimate production time
   */
  estimateProductionTime(cuttingPlan: CuttingPlan[]): number {
    let totalTime = 0;

    cuttingPlan.forEach((plan) => {
      const totalCutLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
      const avgFeedRate = 3000; // mm/min (default)
      const cuttingTime = totalCutLength / avgFeedRate; // minutes
      
      // Add setup time (tool changes, positioning)
      const setupTime = plan.cuts.length * 0.5; // 30 seconds per cut
      
      totalTime += cuttingTime + setupTime;
    });

    return Math.ceil(totalTime);
  }

  /**
   * Estimate energy consumption
   */
  estimateEnergyConsumption(cuttingPlan: CuttingPlan[]): number {
    const productionTime = this.estimateProductionTime(cuttingPlan);
    const powerConsumption = 20; // kW (average for Yilmaz machines)
    return (productionTime / 60) * powerConsumption; // kWh
  }

  /**
   * Validate cutting plan
   */
  validateCuttingPlan(cuttingPlan: CuttingPlan[]): ValidationResult {
    return this.validator.validateCuttingPlan(cuttingPlan);
  }

  /**
   * Update machine status from network protocol
   */
  private updateMachineStatus(status: any): void {
    this.currentStatus = {
      status: status.status || 'idle',
      currentOperation: status.currentOperation,
      progress: status.progress || 0,
      errorCode: status.errorCode,
      errorMessage: status.errorMessage,
      temperature: status.temperature,
      spindleSpeed: status.spindleSpeed,
      feedRate: status.feedRate,
      toolNumber: status.toolNumber,
      lastUpdate: new Date(status.lastUpdate || Date.now())
    };

    // Notify all callbacks
    this.statusCallbacks.forEach(callback => callback(this.currentStatus));
  }

  /**
   * Start periodic status polling
   */
  private startStatusPolling(): void {
    this.stopStatusPolling();
    
    this.statusUpdateInterval = setInterval(async () => {
      if (this.connectionStatus === 'connected') {
        try {
          await this.getStatus();
        } catch (error) {
          console.error('Status polling error:', error);
        }
      }
    }, 5000); // Poll every 5 seconds
  }

  /**
   * Stop status polling
   */
  private stopStatusPolling(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = undefined;
    }
  }

  /**
   * Get machine model
   */
  getMachineModel(): YilmazMachineModel {
    return this.machineModel;
  }

  /**
   * Check if connected to machine
   */
  isConnected(): boolean {
    return this.networkProtocol.isConnectedToMachine();
  }
}

