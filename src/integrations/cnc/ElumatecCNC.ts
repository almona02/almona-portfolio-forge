/**
 * Elumatec CNC Controller Implementation
 * For aluminum profile processing machines
 */

import { CNCController, MachineStatus, GCodeCommand, ToolPath, MachineCapabilities, OptimizationOptions } from './CNCController';
import { CuttingPlan, Cut, Profile } from '@/types/fabricator';

export class ElumatecCNC extends CNCController {
  private statusUpdateInterval?: NodeJS.Timeout;
  private statusSubscribers: Set<(status: MachineStatus) => void> = new Set();

  constructor(machineId: string, machineName: string = 'Elumatec CNC Machine') {
    const capabilities: MachineCapabilities = {
      maxLength: 7000, // 7 meters
      maxWidth: 2500, // 2.5 meters
      maxHeight: 250, // 250mm
      supportedMaterials: ['aluminum', 'upvc', 'steel', 'composite'],
      supportedAngles: [0, 22.5, 30, 45, 60, 67.5, 90, 112.5, 135, 150, 180],
      minCutLength: 50, // 50mm minimum
      maxCutLength: 7000, // 7 meters maximum
      precision: 0.1, // 0.1mm precision
      cuttingSpeed: 10000, // 10 m/min
      supportedProfiles: [], // All profiles supported
    };

    super(machineId, machineName, capabilities);
  }

  async connect(): Promise<boolean> {
    try {
      this.connectionStatus = 'connecting';
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Elumatec machines use proprietary protocols over Ethernet
      this.connectionStatus = 'connected';
      this.currentStatus.status = 'idle';
      this.currentStatus.lastUpdate = new Date();

      this.startStatusPolling();
      return true;
    } catch (error) {
      this.connectionStatus = 'error';
      console.error('Elumatec CNC connection error:', error);
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
      console.error('Elumatec CNC disconnection error:', error);
      return false;
    }
  }

  async getStatus(): Promise<MachineStatus> {
    return { ...this.currentStatus };
  }

  async generateGCode(
    cuttingPlan: CuttingPlan[],
    options?: OptimizationOptions
  ): Promise<GCodeCommand[]> {
    const commands: GCodeCommand[] = [];
    let lineNumber = 1;

    // Elumatec-specific G-code header
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

    // Elumatec machines specialize in aluminum profile processing
    for (const plan of cuttingPlan) {
      // Check if material is aluminum/UPVC
      if (!['aluminum', 'upvc'].includes(plan.profile.material.toLowerCase())) {
        console.warn(`Elumatec machine may not be optimal for ${plan.profile.material}`);
      }

      commands.push({
        command: 'G0',
        parameters: { X: 0, Y: 0, Z: 20 },
        lineNumber: lineNumber++,
      });

      for (const cut of plan.cuts) {
        const feedRate = this.calculateFeedRate(plan.profile.material);
        commands.push({
          command: 'G1',
          parameters: { F: feedRate },
          lineNumber: lineNumber++,
        });

        const angleRad = (cut.angle * Math.PI) / 180;
        const endX = cut.length * Math.cos(angleRad);
        const endY = cut.length * Math.sin(angleRad);

        commands.push({
          command: 'G1',
          parameters: {
            X: endX.toFixed(3),
            Y: endY.toFixed(3),
            Z: -(plan.profile.thickness || 20),
          },
          lineNumber: lineNumber++,
        });

        // Elumatec machines support drilling and milling operations
        if (options?.prioritizeQuality) {
          // Add deburring pass
          commands.push({
            command: 'M102', // Elumatec deburring command
            parameters: { P: 0.5 }, // Deburring pressure
            lineNumber: lineNumber++,
          });
        }

        commands.push({
          command: 'G0',
          parameters: { Z: 20 },
          lineNumber: lineNumber++,
        });
      }
    }

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
    const sortedCuts = this.sortCutsForOptimalPath(cuts, options);

    let currentX = 0;
    let currentY = 0;
    let currentZ = 0;

    for (const cut of sortedCuts) {
      const angleRad = (cut.angle * Math.PI) / 180;
      const endX = currentX + cut.length * Math.cos(angleRad);
      const endY = currentY + cut.length * Math.sin(angleRad);
      const endZ = -(profile.thickness || 20);

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
      currentZ = 0;
    }

    return toolPaths;
  }

  async sendGCode(commands: GCodeCommand[]): Promise<boolean> {
    try {
      if (this.connectionStatus !== 'connected') {
        throw new Error('Machine not connected');
      }

      const gcodeString = commands
        .map((cmd) => {
          const params = Object.entries(cmd.parameters)
            .map(([key, value]) => `${key}${value}`)
            .join(' ');
          return `N${cmd.lineNumber} ${cmd.command} ${params}`.trim();
        })
        .join('\n');

      console.log('Sending G-code to Elumatec machine:', gcodeString);
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

      const recoverableErrors = ['E001', 'E002', 'E003', 'E005'];
      if (recoverableErrors.includes(errorCode)) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
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
    let totalTime = 0;

    for (const plan of cuttingPlan) {
      const totalCutLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
      const cuttingTime = totalCutLength / (this.capabilities.cuttingSpeed * 1000);
      const setupTime = 2.5; // Setup time for aluminum profiles
      const toolChangeTime = plan.cuts.length * 0.12;

      totalTime += cuttingTime + setupTime + toolChangeTime;
    }

    return totalTime;
  }

  async estimateEnergyConsumption(cuttingPlan: CuttingPlan[]): Promise<number> {
    const productionTime = await this.estimateProductionTime(cuttingPlan);
    const powerConsumption = 12; // 12 kW average for aluminum processing
    return (productionTime / 60) * powerConsumption;
  }

  private calculateFeedRate(material: string): number {
    const feedRates: Record<string, number> = {
      aluminum: 4000,
      upvc: 5000,
      steel: 2000,
      composite: 3500,
    };
    return feedRates[material.toLowerCase()] || 4000;
  }

  private calculateSpindleSpeed(material: string): number {
    const speeds: Record<string, number> = {
      aluminum: 10000,
      upvc: 12000,
      steel: 8000,
      composite: 10000,
    };
    return speeds[material.toLowerCase()] || 10000;
  }

  private sortCutsForOptimalPath(
    cuts: Cut[],
    options?: OptimizationOptions
  ): Cut[] {
    if (options?.minimizeTime) {
      return [...cuts].sort((a, b) => a.angle - b.angle);
    }
    if (options?.minimizeEnergy) {
      // Sort by length to minimize acceleration/deceleration
      return [...cuts].sort((a, b) => b.length - a.length);
    }
    return cuts;
  }

  private startStatusPolling(): void {
    this.statusUpdateInterval = setInterval(() => {
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

