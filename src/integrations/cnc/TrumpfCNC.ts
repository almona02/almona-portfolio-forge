/**
 * Trumpf CNC Controller Implementation
 * For metal processing and laser cutting machines
 */

import { CNCController, MachineStatus, GCodeCommand, ToolPath, MachineCapabilities, OptimizationOptions } from './CNCController';
import { CuttingPlan, Cut, Profile } from '@/types/fabricator';

export class TrumpfCNC extends CNCController {
  private statusUpdateInterval?: NodeJS.Timeout;
  private statusSubscribers: Set<(status: MachineStatus) => void> = new Set();

  constructor(machineId: string, machineName: string = 'Trumpf CNC Machine') {
    const capabilities: MachineCapabilities = {
      maxLength: 10000, // 10 meters
      maxWidth: 5000, // 5 meters
      maxHeight: 500, // 500mm
      supportedMaterials: ['steel', 'aluminum', 'stainless_steel', 'copper', 'brass', 'titanium'],
      supportedAngles: [0, 15, 22.5, 30, 45, 60, 67.5, 90, 112.5, 135, 150, 180],
      minCutLength: 10, // 10mm minimum (laser precision)
      maxCutLength: 10000, // 10 meters maximum
      precision: 0.01, // 0.01mm precision (laser precision)
      cuttingSpeed: 20000, // 20 m/min (laser cutting is fast)
      supportedProfiles: [], // All profiles supported
    };

    super(machineId, machineName, capabilities);
  }

  async connect(): Promise<boolean> {
    try {
      this.connectionStatus = 'connecting';
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Trumpf machines use proprietary protocols and often require authentication
      this.connectionStatus = 'connected';
      this.currentStatus.status = 'idle';
      this.currentStatus.lastUpdate = new Date();

      this.startStatusPolling();
      return true;
    } catch (error) {
      this.connectionStatus = 'error';
      console.error('Trumpf CNC connection error:', error);
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
      console.error('Trumpf CNC disconnection error:', error);
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

    // Trumpf-specific G-code header (laser cutting)
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

    // Laser power and gas settings
    commands.push({
      command: 'M106', // Set laser power
      parameters: { P: 80 }, // 80% power
      lineNumber: lineNumber++,
    });

    commands.push({
      command: 'M107', // Set assist gas
      parameters: { P: 1 }, // Oxygen assist
      lineNumber: lineNumber++,
    });

    // Trumpf machines excel at metal processing
    for (const plan of cuttingPlan) {
      if (!['steel', 'aluminum', 'stainless_steel'].includes(plan.profile.material.toLowerCase())) {
        console.warn(`Trumpf machine optimized for metals, not ${plan.profile.material}`);
      }

      commands.push({
        command: 'G0',
        parameters: { X: 0, Y: 0, Z: 5 },
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

        // Laser on
        commands.push({
          command: 'M3', // Laser on
          parameters: {},
          lineNumber: lineNumber++,
        });

        commands.push({
          command: 'G1',
          parameters: {
            X: endX.toFixed(3),
            Y: endY.toFixed(3),
            Z: -(plan.profile.thickness || 10),
          },
          lineNumber: lineNumber++,
        });

        // Laser off
        commands.push({
          command: 'M5', // Laser off
          parameters: {},
          lineNumber: lineNumber++,
        });

        commands.push({
          command: 'G0',
          parameters: { Z: 5 },
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
      const endZ = -(profile.thickness || 10);

      toolPaths.push({
        startPoint: { x: currentX, y: currentY, z: currentZ },
        endPoint: { x: endX, y: endY, z: endZ },
        feedRate: this.calculateFeedRate(profile.material),
        spindleSpeed: 0, // Laser doesn't use spindle
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

      console.log('Sending G-code to Trumpf machine:', gcodeString);
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

      const recoverableErrors = ['E001', 'E002', 'E003', 'E006', 'E007'];
      if (recoverableErrors.includes(errorCode)) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
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
      const setupTime = 3; // Setup time for laser machines
      const toolChangeTime = 0; // No tool changes for laser

      totalTime += cuttingTime + setupTime + toolChangeTime;
    }

    return totalTime;
  }

  async estimateEnergyConsumption(cuttingPlan: CuttingPlan[]): Promise<number> {
    const productionTime = await this.estimateProductionTime(cuttingPlan);
    const powerConsumption = 25; // 25 kW average for laser cutting
    return (productionTime / 60) * powerConsumption;
  }

  private calculateFeedRate(material: string): number {
    const feedRates: Record<string, number> = {
      steel: 5000,
      aluminum: 8000,
      stainless_steel: 4000,
      copper: 6000,
      brass: 7000,
      titanium: 3000,
    };
    return feedRates[material.toLowerCase()] || 5000;
  }

  private calculateSpindleSpeed(material: string): number {
    // Laser doesn't use spindle speed
    return 0;
  }

  private sortCutsForOptimalPath(
    cuts: Cut[],
    options?: OptimizationOptions
  ): Cut[] {
    if (options?.minimizeTime) {
      // For laser cutting, minimize travel distance
      return [...cuts].sort((a, b) => a.length - b.length);
    }
    if (options?.minimizeEnergy) {
      // Group similar angles to minimize laser power adjustments
      return [...cuts].sort((a, b) => a.angle - b.angle);
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

