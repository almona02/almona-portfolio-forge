/**
 * Just-in-Time (JIT) Production Scheduler
 * Optimizes production scheduling for lean manufacturing
 */

import { WindowUnit, OptimizationResult } from '@/types/fabricator';

export interface ProductionOrder {
  id: string;
  projectId: string;
  priority: number; // 1-10, higher is more urgent
  dueDate: Date;
  estimatedDuration: number; // hours
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed';
  scheduledStart?: Date;
  scheduledEnd?: Date;
  actualStart?: Date;
  actualEnd?: Date;
  dependencies: string[]; // IDs of other orders that must complete first
}

export interface ProductionSlot {
  startTime: Date;
  endTime: Date;
  machineId: string;
  orderId?: string;
  available: boolean;
}

export interface Schedule {
  date: Date;
  slots: ProductionSlot[];
  utilization: number; // 0-100
}

export class LeanScheduler {
  private orders: Map<string, ProductionOrder> = new Map();
  private schedules: Map<string, Schedule[]> = new Map(); // machineId -> schedules
  private machines: string[] = ['machine_1', 'machine_2', 'machine_3'];

  /**
   * Add production order
   */
  addOrder(order: ProductionOrder): void {
    this.orders.set(order.id, order);
  }

  /**
   * Schedule orders using JIT principles
   */
  scheduleOrders(orders: ProductionOrder[]): Map<string, Schedule[]> {
    // Sort orders by due date and priority
    const sortedOrders = [...orders].sort((a, b) => {
      const dueDateDiff = a.dueDate.getTime() - b.dueDate.getTime();
      if (Math.abs(dueDateDiff) < 24 * 60 * 60 * 1000) {
        // Same day, sort by priority
        return b.priority - a.priority;
      }
      return dueDateDiff;
    });

    const schedules = new Map<string, Schedule[]>();

    for (const machineId of this.machines) {
      const machineSchedules: Schedule[] = [];
      let currentTime = new Date();

      for (const order of sortedOrders) {
        if (order.status !== 'pending') continue;

        // Check dependencies
        const dependenciesMet = order.dependencies.every((depId) => {
          const depOrder = this.orders.get(depId);
          return depOrder?.status === 'completed';
        });

        if (!dependenciesMet) continue;

        // Find available slot
        const slot = this.findAvailableSlot(
          machineId,
          currentTime,
          order.estimatedDuration
        );

        if (slot) {
          order.scheduledStart = slot.startTime;
          order.scheduledEnd = slot.endTime;
          order.status = 'scheduled';
          slot.orderId = order.id;
          slot.available = false;

          // Update schedule
          const scheduleDate = new Date(slot.startTime);
          scheduleDate.setHours(0, 0, 0, 0);

          let schedule = machineSchedules.find(
            (s) => s.date.getTime() === scheduleDate.getTime()
          );

          if (!schedule) {
            schedule = {
              date: scheduleDate,
              slots: [],
              utilization: 0,
            };
            machineSchedules.push(schedule);
          }

          schedule.slots.push(slot);
          this.updateScheduleUtilization(schedule);

          currentTime = new Date(slot.endTime);
        }
      }

      schedules.set(machineId, machineSchedules);
    }

    this.schedules = schedules;
    return schedules;
  }

  /**
   * Find available slot for order
   */
  private findAvailableSlot(
    machineId: string,
    startTime: Date,
    duration: number
  ): ProductionSlot | null {
    const endTime = new Date(startTime.getTime() + duration * 60 * 60 * 1000);

    // Check if slot conflicts with existing schedule
    const machineSchedules = this.schedules.get(machineId) || [];
    for (const schedule of machineSchedules) {
      for (const slot of schedule.slots) {
        if (!slot.available) continue;
        if (
          (startTime >= slot.startTime && startTime < slot.endTime) ||
          (endTime > slot.startTime && endTime <= slot.endTime) ||
          (startTime <= slot.startTime && endTime >= slot.endTime)
        ) {
          // Conflict found, try next available time
          startTime = new Date(slot.endTime);
          return this.findAvailableSlot(machineId, startTime, duration);
        }
      }
    }

    return {
      startTime,
      endTime,
      machineId,
      available: true,
    };
  }

  /**
   * Update schedule utilization
   */
  private updateScheduleUtilization(schedule: Schedule): void {
    const totalMinutes = 24 * 60; // 24 hours
    const usedMinutes = schedule.slots
      .filter((s) => !s.available)
      .reduce((sum, s) => {
        const duration =
          (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60);
        return sum + duration;
      }, 0);

    schedule.utilization = (usedMinutes / totalMinutes) * 100;
  }

  /**
   * Get schedule for machine
   */
  getSchedule(machineId: string, date?: Date): Schedule[] {
    const schedules = this.schedules.get(machineId) || [];

    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      return schedules.filter(
        (s) => s.date.getTime() === targetDate.getTime()
      );
    }

    return schedules;
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): ProductionOrder | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Update order status
   */
  updateOrderStatus(orderId: string, status: ProductionOrder['status']): void {
    const order = this.orders.get(orderId);
    if (!order) return;

    order.status = status;
    if (status === 'in_progress' && !order.actualStart) {
      order.actualStart = new Date();
    }
    if (status === 'completed' && !order.actualEnd) {
      order.actualEnd = new Date();
    }
  }

  /**
   * Calculate schedule efficiency
   */
  calculateEfficiency(): {
    averageUtilization: number;
    onTimeDelivery: number;
    totalOrders: number;
    completedOrders: number;
  } {
    const allSchedules = Array.from(this.schedules.values()).flat();
    const averageUtilization =
      allSchedules.reduce((sum, s) => sum + s.utilization, 0) /
      (allSchedules.length || 1);

    const orders = Array.from(this.orders.values());
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const onTimeOrders = completedOrders.filter((o) => {
      if (!o.actualEnd || !o.dueDate) return false;
      return o.actualEnd <= o.dueDate;
    });

    return {
      averageUtilization,
      onTimeDelivery:
        completedOrders.length > 0
          ? (onTimeOrders.length / completedOrders.length) * 100
          : 0,
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
    };
  }
}

