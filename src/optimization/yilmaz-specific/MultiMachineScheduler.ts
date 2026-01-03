/**
 * Multi-Machine Scheduler
 * Coordinating saws + CNC centers
 * Optimizes production across multiple Yilmaz machines
 */

import { CuttingPlan, Profile } from '@/types/fabricator';

export type MachineType = 'dc_saw' | 'cnc_center';
export type MachineStatus = 'idle' | 'running' | 'maintenance' | 'error';

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  status: MachineStatus;
  capabilities: {
    maxLength: number;
    maxWidth?: number;
    supportedAngles: number[];
    supportedMaterials: string[];
    cuttingSpeed: number; // mm/min
    setupTime: number; // minutes
  };
  currentJob?: Job;
  queue: Job[];
  location?: string;
}

export interface Job {
  id: string;
  orderNumber: string;
  cuttingPlan: CuttingPlan;
  priority: number;
  estimatedDuration: number; // minutes
  assignedMachine?: string;
  startTime?: Date;
  endTime?: Date;
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'cancelled';
  dependencies?: string[]; // Job IDs that must complete first
}

export interface ScheduleResult {
  schedule: Array<{
    machine: Machine;
    jobs: Job[];
    totalDuration: number;
    utilization: number;
  }>;
  totalDuration: number;
  efficiency: number;
  recommendations: string[];
}

export class MultiMachineScheduler {
  private machines: Map<string, Machine> = new Map();
  private jobs: Map<string, Job> = new Map();
  private schedule: ScheduleResult | null = null;

  /**
   * Register machine
   */
  registerMachine(machine: Machine): void {
    this.machines.set(machine.id, machine);
  }

  /**
   * Add job to schedule
   */
  addJob(job: Job): void {
    this.jobs.set(job.id, job);
  }

  /**
   * Remove job
   */
  removeJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  /**
   * Schedule jobs across machines
   */
  scheduleJobs(optimizationStrategy: 'minimize_time' | 'minimize_waste' | 'balance_load' = 'balance_load'): ScheduleResult {
    const availableMachines = Array.from(this.machines.values())
      .filter(m => m.status === 'idle' || m.status === 'running');

    const pendingJobs = Array.from(this.jobs.values())
      .filter(j => j.status === 'pending')
      .sort((a, b) => b.priority - a.priority); // Sort by priority

    const machineSchedules = new Map<string, Job[]>();

    // Initialize machine schedules
    availableMachines.forEach(machine => {
      machineSchedules.set(machine.id, []);
    });

    // Assign jobs to machines based on strategy
    switch (optimizationStrategy) {
      case 'minimize_time':
        this.scheduleMinimizeTime(pendingJobs, availableMachines, machineSchedules);
        break;
      case 'minimize_waste':
        this.scheduleMinimizeWaste(pendingJobs, availableMachines, machineSchedules);
        break;
      case 'balance_load':
      default:
        this.scheduleBalanceLoad(pendingJobs, availableMachines, machineSchedules);
        break;
    }

    // Build schedule result
    const schedule: ScheduleResult['schedule'] = [];
    let totalDuration = 0;

    machineSchedules.forEach((jobs, machineId) => {
      const machine = this.machines.get(machineId)!;
      const machineDuration = this.calculateMachineDuration(machine, jobs);
      const utilization = this.calculateUtilization(machine, jobs, machineDuration);

      schedule.push({
        machine,
        jobs,
        totalDuration: machineDuration,
        utilization
      });

      totalDuration = Math.max(totalDuration, machineDuration);
    });

    const efficiency = this.calculateOverallEfficiency(schedule);
    const recommendations = this.generateRecommendations(schedule, totalDuration);

    this.schedule = {
      schedule,
      totalDuration,
      efficiency,
      recommendations
    };

    return this.schedule;
  }

  /**
   * Schedule to minimize total time
   */
  private scheduleMinimizeTime(
    jobs: Job[],
    machines: Machine[],
    machineSchedules: Map<string, Job[]>
  ): void {
    // Assign jobs to fastest available machine
    jobs.forEach(job => {
      const suitableMachines = this.findSuitableMachines(job, machines);
      if (suitableMachines.length === 0) {
        return; // No suitable machine
      }

      // Find machine with shortest current queue
      const bestMachine = suitableMachines.reduce((best, machine) => {
        const bestQueue = machineSchedules.get(best.id) || [];
        const currentQueue = machineSchedules.get(machine.id) || [];
        const bestDuration = this.calculateMachineDuration(best, bestQueue);
        const currentDuration = this.calculateMachineDuration(machine, currentQueue);

        return currentDuration < bestDuration ? machine : best;
      });

      const queue = machineSchedules.get(bestMachine.id) || [];
      queue.push(job);
      machineSchedules.set(bestMachine.id, queue);
      job.assignedMachine = bestMachine.id;
      job.status = 'assigned';
    });
  }

  /**
   * Schedule to minimize waste
   */
  private scheduleMinimizeWaste(
    jobs: Job[],
    machines: Machine[],
    machineSchedules: Map<string, Job[]>
  ): void {
    // Group jobs by profile/material to minimize setup changes
    const jobGroups = this.groupJobsByProfile(jobs);

    jobGroups.forEach(group => {
      const suitableMachines = machines.filter(m =>
        this.canMachineHandleJob(group.jobs[0], m)
      );

      if (suitableMachines.length === 0) {
        return;
      }

      // Assign group to machine with best waste efficiency
      const bestMachine = suitableMachines.reduce((best, machine) => {
        const bestWaste = this.estimateWaste(best, group.jobs);
        const currentWaste = this.estimateWaste(machine, group.jobs);
        return currentWaste < bestWaste ? machine : best;
      });

      const queue = machineSchedules.get(bestMachine.id) || [];
      group.jobs.forEach(job => {
        queue.push(job);
        job.assignedMachine = bestMachine.id;
        job.status = 'assigned';
      });
      machineSchedules.set(bestMachine.id, queue);
    });
  }

  /**
   * Schedule to balance load across machines
   */
  private scheduleBalanceLoad(
    jobs: Job[],
    machines: Machine[],
    machineSchedules: Map<string, Job[]>
  ): void {
    jobs.forEach(job => {
      const suitableMachines = this.findSuitableMachines(job, machines);
      if (suitableMachines.length === 0) {
        return;
      }

      // Find machine with least current load
      const bestMachine = suitableMachines.reduce((best, machine) => {
        const bestQueue = machineSchedules.get(best.id) || [];
        const currentQueue = machineSchedules.get(machine.id) || [];
        const bestLoad = this.calculateLoad(best, bestQueue);
        const currentLoad = this.calculateLoad(machine, currentQueue);

        return currentLoad < bestLoad ? machine : best;
      });

      const queue = machineSchedules.get(bestMachine.id) || [];
      queue.push(job);
      machineSchedules.set(bestMachine.id, queue);
      job.assignedMachine = bestMachine.id;
      job.status = 'assigned';
    });
  }

  /**
   * Find machines suitable for job
   */
  private findSuitableMachines(job: Job, machines: Machine[]): Machine[] {
    return machines.filter(machine => this.canMachineHandleJob(job, machine));
  }

  /**
   * Check if machine can handle job
   */
  private canMachineHandleJob(job: Job, machine: Machine): boolean {
    const plan = job.cuttingPlan;

    // Check material support
    if (!machine.capabilities.supportedMaterials.includes(plan.profile.material.toLowerCase())) {
      return false;
    }

    // Check length support
    const maxCutLength = Math.max(...plan.cuts.map(c => c.length));
    if (maxCutLength > machine.capabilities.maxLength) {
      return false;
    }

    // Check angle support
    const requiredAngles = new Set(plan.cuts.map(c => c.angle));
    for (const angle of requiredAngles) {
      if (!machine.capabilities.supportedAngles.includes(angle)) {
        // Check if angle is close enough (within 1 degree tolerance)
        const hasCloseAngle = machine.capabilities.supportedAngles.some(
          supportedAngle => Math.abs(supportedAngle - angle) < 1
        );
        if (!hasCloseAngle) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Calculate machine duration for jobs
   */
  private calculateMachineDuration(machine: Machine, jobs: Job[]): number {
    if (jobs.length === 0) {
      return 0;
    }

    let totalDuration = machine.capabilities.setupTime;

    jobs.forEach(job => {
      totalDuration += job.estimatedDuration;
    });

    return totalDuration;
  }

  /**
   * Calculate machine utilization
   */
  private calculateUtilization(machine: Machine, jobs: Job[], duration: number): number {
    if (duration === 0) {
      return 0;
    }

    // Utilization = (working time / total available time) * 100
    // Assuming 8-hour workday
    const availableTime = 8 * 60; // minutes
    return (duration / availableTime) * 100;
  }

  /**
   * Calculate machine load
   */
  private calculateLoad(machine: Machine, jobs: Job[]): number {
    return this.calculateMachineDuration(machine, jobs);
  }

  /**
   * Calculate overall efficiency
   */
  private calculateOverallEfficiency(schedule: ScheduleResult['schedule']): number {
    if (schedule.length === 0) {
      return 0;
    }

    const totalUtilization = schedule.reduce((sum, s) => sum + s.utilization, 0);
    return totalUtilization / schedule.length;
  }

  /**
   * Estimate waste for jobs on machine
   */
  private estimateWaste(machine: Machine, jobs: Job[]): number {
    return jobs.reduce((sum, job) => {
      return sum + job.cuttingPlan.totalWaste;
    }, 0);
  }

  /**
   * Group jobs by profile
   */
  private groupJobsByProfile(jobs: Job[]): Array<{ profile: Profile; jobs: Job[] }> {
    const groups = new Map<string, Job[]>();

    jobs.forEach(job => {
      const profileId = job.cuttingPlan.profile.id;
      if (!groups.has(profileId)) {
        groups.set(profileId, []);
      }
      groups.get(profileId)!.push(job);
    });

    return Array.from(groups.entries()).map(([_profileId, jobs]) => ({
      profile: jobs[0].cuttingPlan.profile,
      jobs
    }));
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    schedule: ScheduleResult['schedule'],
    _totalDuration: number
  ): string[] {
    const recommendations: string[] = [];

    // Check for underutilized machines
    schedule.forEach(s => {
      if (s.utilization < 50) {
        recommendations.push(`Machine ${s.machine.name} is underutilized (${s.utilization.toFixed(1)}%)`);
      }
    });

    // Check for overloaded machines
    schedule.forEach(s => {
      if (s.utilization > 100) {
        recommendations.push(`Machine ${s.machine.name} is overloaded (${s.utilization.toFixed(1)}%)`);
      }
    });

    // Check for idle machines
    const idleMachines = schedule.filter(s => s.jobs.length === 0);
    if (idleMachines.length > 0) {
      recommendations.push(`${idleMachines.length} machine(s) have no jobs assigned`);
    }

    // Check for long queues
    schedule.forEach(s => {
      if (s.jobs.length > 10) {
        recommendations.push(`Machine ${s.machine.name} has a long queue (${s.jobs.length} jobs)`);
      }
    });

    return recommendations;
  }

  /**
   * Get current schedule
   */
  getSchedule(): ScheduleResult | null {
    return this.schedule;
  }

  /**
   * Get machine by ID
   */
  getMachine(machineId: string): Machine | undefined {
    return this.machines.get(machineId);
  }

  /**
   * Get all machines
   */
  getAllMachines(): Machine[] {
    return Array.from(this.machines.values());
  }

  /**
   * Update machine status
   */
  updateMachineStatus(machineId: string, status: MachineStatus): boolean {
    const machine = this.machines.get(machineId);
    if (!machine) {
      return false;
    }

    machine.status = status;
    return true;
  }
}

