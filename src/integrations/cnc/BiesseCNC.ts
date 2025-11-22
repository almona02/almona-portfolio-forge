/**
 * Biesse CNC Controller Implementation
 * For woodworking and panel processing machines
 */

import { CNCController, MachineStatus, GCodeCommand, ToolPath, MachineCapabilities, OptimizationOptions } from './CNCController';
import { CuttingPlan, Cut, Profile } from '@/types/fabricator';

export class BiesseCNC extends CNCController {
  private statusUpdateInterval?: NodeJS.Timeout;
  private statusSubscribers: Set<(status: MachineStatus) => void> = new Set();

  constructor(machineId: string, machineName: string = 'Biesse CNC Machine') {
    const capabilities: MachineCapabilities = {
      maxLength: 6000, // 6 meters
      maxWidth: 3000, // 3 meters
      maxHeight: 200, // 200mm
      supportedMaterials: ['wood', 'mdf', 'plywood', 'aluminum', 'upvc'],
      supportedAngles: [0, 15, 22.5, 30, 45, 60, 67.5, 90, 112.5, 135, 150, 180],
      minCutLength: 50, // 50mm minimum
      maxCutLength: 6000, // 6 meters maximum
      precision: 0.1, // 0.1mm precision
      cuttingSpeed: 12000, // 12 m/min
      supportedProfiles: [], // All profiles supported
    };

    super(machineId, machineName, capabilities);
  }

  async connect(): Promise<boolean> {
    try {
      this.connectionStatus = 'connecting';
      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In real implementation, this would establish connection to Biesse machine
      // via serial port, Ethernet, or proprietary protocol
      this.connectionStatus = 'connected';
      this.currentStatus.status = 'idle';
      this.currentStatus.lastUpdate = new Date();

      // Start status polling
      this.startStatusPolling();

      return true;
    } catch (error) {
      this.connectionStatus = 'error';
      console.error('Biesse CNC connection error:', error);
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      this.stopStatusPolling();
      this.connectionStatus = 'disconnected';
      this.currentStatus.status = 'idle';
      return true;
    } catch (error) {
      console.error('Biesse CNC disconnection error:', error);
      return false;
    }
  }

  async getStatus(): Promise<MachineStatus> {
    // In real implementation, this would query the machine
    // For now, return current cached status
    return { ...this.currentStatus };
  }

  async generateGCode(
    cuttingPlan: CuttingPlan[],
    options?: OptimizationOptions
  ): Promise<GCodeCommand[]> {
    const commands: GCodeCommand[] = [];
    let lineNumber = 1;

    // Biesse-specific G-code header
    commands.push({
      command: 'G21', // Metric units
      parameters: {},
      lineNumber: lineNumber++,
    });

    commands.push({
      command: 'G90', // Absolute positioning
      parameters: {},
      lineNumber: lineNumber++,
    });

    commands.push({
      command: 'G94', // Feed rate mode
      parameters: {},
      lineNumber: lineNumber++,
    });

    // Generate G-code for each cutting plan
    for (const plan of cuttingPlan) {
      // Move to start position
      commands.push({
        command: 'G0',
        parameters: { X: 0, Y: 0, Z: 10 },
        lineNumber: lineNumber++,
      });

      // Process each cut
      for (const cut of plan.cuts) {
        // Set cutting speed based on material
        const feedRate = this.calculateFeedRate(plan.profile.material);
        commands.push({
          command: 'G1',
          parameters: { F: feedRate },
          lineNumber: lineNumber++,
        });

        // Calculate cut coordinates
        const angleRad = (cut.angle * Math.PI) / 180;
        const endX = cut.length * Math.cos(angleRad);
        const endY = cut.length * Math.sin(angleRad);

        // Perform cut
        commands.push({
          command: 'G1',
          parameters: {
            X: endX.toFixed(3),
            Y: endY.toFixed(3),
            Z: -plan.profile.thickness || -10,
          },
          lineNumber: lineNumber++,
        });

        // Retract
        commands.push({
          command: 'G0',
          parameters: { Z: 10 },
          lineNumber: lineNumber++,
        });
      }
    }

    // End program
    commands.push({
      command: 'M30',
      parameters: {},
      lineNumber: lineNumber++,
    });

    return commands;
  }

  async optimizeToolPath(
    cuts: Cut[],
    profile: Profile,
    options?: OptimizationOptions
  ): Promise<ToolPath[]> {
    const toolPaths: ToolPath[] = [];

    // Sort cuts for optimal path (minimize travel distance)
    const sortedCuts = this.sortCutsForOptimalPath(cuts, options);

    let currentX = 0;
    let currentY = 0;
    let currentZ = 0;

    for (const cut of sortedCuts) {
      const angleRad = (cut.angle * Math.PI) / 180;
      const endX = currentX + cut.length * Math.cos(angleRad);
      const endY = currentY + cut.length * Math.sin(angleRad);
      const endZ = -(profile.thickness || 10);

      toolPaths.push({
        startPoint: { x: currentX, y: currentY, z: currentZ },
        endPoint: { x: endX, y: endY, z: endZ },
        feedRate: this.calculateFeedRate(profile.material),
        spindleSpeed: this.calculateSpindleSpeed(profile.material),
        toolNumber: 1,
        operation: 'cut',
      });

      currentX = endX;
      currentY = endY;
      currentZ = 0; // Retract after cut
    }

    return toolPaths;
  }

  async sendGCode(commands: GCodeCommand[]): Promise<boolean> {
    try {
      if (this.connectionStatus !== 'connected') {
        throw new Error('Machine not connected');
      }

      // In real implementation, send G-code to machine
      // For now, simulate sending
      const gcodeString = commands
        .map((cmd) => {
          const params = Object.entries(cmd.parameters)
            .map(([key, value]) => `${key}${value}`)
            .join(' ');
          return `N${cmd.lineNumber} ${cmd.command} ${params}`.trim();
        })
        .join('\n');

      console.log('Sending G-code to Biesse machine:', gcodeString);
      // Actual implementation would send via serial/Ethernet

      return true;
    } catch (error) {
      console.error('Error sending G-code:', error);
      return false;
    }
  }

  async startOperation(operationId: string): Promise<boolean> {
    try {
      this.currentStatus.status = 'running';
      this.currentStatus.currentOperation = operationId;
      this.currentStatus.progress = 0;
      this.currentStatus.lastUpdate = new Date();
      this.notifyStatusSubscribers();
      return true;
    } catch (error) {
      console.error('Error starting operation:', error);
      return false;
    }
  }

  async pauseOperation(): Promise<boolean> {
    try {
      this.currentStatus.status = 'paused';
      this.currentStatus.lastUpdate = new Date();
      this.notifyStatusSubscribers();
      return true;
    } catch (error) {
      console.error('Error pausing operation:', error);
      return false;
    }
  }

  async resumeOperation(): Promise<boolean> {
    try {
      this.currentStatus.status = 'running';
      this.currentStatus.lastUpdate = new Date();
      this.notifyStatusSubscribers();
      return true;
    } catch (error) {
      console.error('Error resuming operation:', error);
      return false;
    }
  }

  async stopOperation(): Promise<boolean> {
    try {
      this.currentStatus.status = 'idle';
      this.currentStatus.currentOperation = undefined;
      this.currentStatus.progress = 0;
      this.currentStatus.lastUpdate = new Date();
      this.notifyStatusSubscribers();
      return true;
    } catch (error) {
      console.error('Error stopping operation:', error);
      return false;
    }
  }

  async handleError(errorCode: string, errorMessage: string): Promise<boolean> {
    try {
      this.currentStatus.status = 'error';
      this.currentStatus.errorCode = errorCode;
      this.currentStatus.errorMessage = errorMessage;
      this.currentStatus.lastUpdate = new Date();
      this.notifyStatusSubscribers();

      // Attempt automatic recovery for certain error codes
      const recoverableErrors = ['E001', 'E002', 'E003']; // Example error codes
      if (recoverableErrors.includes(errorCode)) {
        // Wait and retry
        await new Promise((resolve) => setTimeout(resolve, 2000));
        this.currentStatus.status = 'idle';
        this.currentStatus.errorCode = undefined;
        this.currentStatus.errorMessage = undefined;
        this.notifyStatusSubscribers();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error handling machine error:', error);
      return false;
    }
  }

  subscribeToStatusUpdates(callback: (status: MachineStatus) => void): () => void {
    this.statusSubscribers.add(callback);
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  async estimateProductionTime(cuttingPlan: CuttingPlan[]): Promise<number> {
    let totalTime = 0; // in minutes

    for (const plan of cuttingPlan) {
      const totalCutLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
      const cuttingTime = totalCutLength / (this.capabilities.cuttingSpeed * 1000); // Convert to minutes
      const setupTime = 2; // 2 minutes setup per plan
      const toolChangeTime = plan.cuts.length * 0.1; // 0.1 min per tool change

      totalTime += cuttingTime + setupTime + toolChangeTime;
    }

    return totalTime;
  }

  async estimateEnergyConsumption(cuttingPlan: CuttingPlan[]): Promise<number> {
    const productionTime = await this.estimateProductionTime(cuttingPlan);
    const powerConsumption = 15; // 15 kW average power consumption
    return (productionTime / 60) * powerConsumption; // kWh
  }

  private calculateFeedRate(material: string): number {
    const feedRates: Record<string, number> = {
      wood: 8000,
      mdf: 6000,
      plywood: 7000,
      aluminum: 3000,
      upvc: 5000,
    };
    return feedRates[material.toLowerCase()] || 5000;
  }

  private calculateSpindleSpeed(material: string): number {
    const speeds: Record<string, number> = {
      wood: 18000,
      mdf: 20000,
      plywood: 18000,
      aluminum: 12000,
      upvc: 15000,
    };
    return speeds[material.toLowerCase()] || 15000;
  }

  private sortCutsForOptimalPath(
    cuts: Cut[],
    options?: OptimizationOptions
  ): Cut[] {
    // Simple nearest-neighbor algorithm for path optimization
    if (options?.minimizeTime) {
      // Sort by angle similarity to minimize tool changes
      return [...cuts].sort((a, b) => a.angle - b.angle);
    }
    return cuts;
  }

  private startStatusPolling(): void {
    this.statusUpdateInterval = setInterval(() => {
      // In real implementation, query machine status
      // For now, simulate status updates
      if (this.currentStatus.status === 'running') {
        this.currentStatus.progress = Math.min(
          this.currentStatus.progress + 1,
          100
        );
        this.currentStatus.lastUpdate = new Date();
        this.notifyStatusSubscribers();
      }
    }, 1000);
  }

  private stopStatusPolling(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = undefined;
    }
  }

  private notifyStatusSubscribers(): void {
    this.statusSubscribers.forEach((callback) => {
      callback({ ...this.currentStatus });
    });
  }
}

