/**
 * Cross-Facility Location Synchronization
 * Coordinates production across multiple locations
 */

export interface Location {
  id: string;
  name: string;
  address: string;
  timezone: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'maintenance';
  lastSync: Date;
}

export interface ProductionTask {
  id: string;
  projectId: string;
  locationId: string;
  type: 'cutting' | 'assembly' | 'quality' | 'packaging';
  status: 'pending' | 'in_progress' | 'completed' | 'transferred';
  priority: number;
  estimatedDuration: number; // hours
  dependencies: string[];
  assignedTo?: string;
}

export interface SyncStatus {
  locationId: string;
  lastSync: Date;
  syncStatus: 'success' | 'failed' | 'in_progress';
  recordsSynced: number;
  errors: string[];
}

export class LocationSync {
  private locations: Map<string, Location> = new Map();
  private tasks: Map<string, ProductionTask[]> = new Map();
  private syncHistory: Map<string, SyncStatus[]> = new Map();

  /**
   * Register location
   */
  registerLocation(location: Location): void {
    this.locations.set(location.id, location);
  }

  /**
   * Get location
   */
  getLocation(locationId: string): Location | undefined {
    return this.locations.get(locationId);
  }

  /**
   * Get all locations
   */
  getAllLocations(): Location[] {
    return Array.from(this.locations.values());
  }

  /**
   * Create production task
   */
  createTask(task: ProductionTask): void {
    const locationTasks = this.tasks.get(task.locationId) || [];
    locationTasks.push(task);
    this.tasks.set(task.locationId, locationTasks);
  }

  /**
   * Transfer task between locations
   */
  transferTask(
    taskId: string,
    fromLocationId: string,
    toLocationId: string
  ): boolean {
    const fromTasks = this.tasks.get(fromLocationId) || [];
    const taskIndex = fromTasks.findIndex((t) => t.id === taskId);

    if (taskIndex === -1) return false;

    const task = fromTasks[taskIndex];
    task.locationId = toLocationId;
    task.status = 'transferred';

    fromTasks.splice(taskIndex, 1);
    this.tasks.set(fromLocationId, fromTasks);

    const toTasks = this.tasks.get(toLocationId) || [];
    toTasks.push(task);
    this.tasks.set(toLocationId, toTasks);

    return true;
  }

  /**
   * Get tasks for location
   */
  getLocationTasks(locationId: string): ProductionTask[] {
    return this.tasks.get(locationId) || [];
  }

  /**
   * Synchronize data between locations
   */
  async synchronize(locationId: string): Promise<SyncStatus> {
    const location = this.locations.get(locationId);
    if (!location) {
      throw new Error(`Location ${locationId} not found`);
    }

    const syncStatus: SyncStatus = {
      locationId,
      lastSync: new Date(),
      syncStatus: 'in_progress',
      recordsSynced: 0,
      errors: [],
    };

    try {
      // Simulate synchronization
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Sync tasks
      const tasks = this.getLocationTasks(locationId);
      syncStatus.recordsSynced = tasks.length;

      // Update location last sync
      location.lastSync = new Date();
      this.locations.set(locationId, location);

      syncStatus.syncStatus = 'success';
    } catch (error) {
      syncStatus.syncStatus = 'failed';
      syncStatus.errors.push(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Store sync history
    const history = this.syncHistory.get(locationId) || [];
    history.push(syncStatus);
    this.syncHistory.set(locationId, history);

    return syncStatus;
  }

  /**
   * Get sync history
   */
  getSyncHistory(locationId: string): SyncStatus[] {
    return this.syncHistory.get(locationId) || [];
  }

  /**
   * Get optimal location for task
   */
  getOptimalLocation(
    taskType: ProductionTask['type'],
    _priority: number
  ): Location | null {
    const availableLocations = Array.from(this.locations.values()).filter(
      (l) => l.status === 'active' && l.capabilities.includes(taskType)
    );

    if (availableLocations.length === 0) return null;

    // Select location with least current load
    let bestLocation: Location | null = null;
    let minLoad = Infinity;

    for (const location of availableLocations) {
      const tasks = this.getLocationTasks(location.id);
      const activeTasks = tasks.filter((t) => t.status === 'in_progress');
      const load = activeTasks.length;

      if (load < minLoad) {
        minLoad = load;
        bestLocation = location;
      }
    }

    return bestLocation;
  }

  /**
   * Get cross-location statistics
   */
  getStatistics(): {
    totalLocations: number;
    activeLocations: number;
    totalTasks: number;
    tasksByLocation: Record<string, number>;
    averageSyncFrequency: number; // hours
  } {
    const locations = Array.from(this.locations.values());
    const activeLocations = locations.filter((l) => l.status === 'active');

    const tasksByLocation: Record<string, number> = {};
    let totalTasks = 0;

    for (const location of locations) {
      const tasks = this.getLocationTasks(location.id);
      tasksByLocation[location.id] = tasks.length;
      totalTasks += tasks.length;
    }

    // Calculate average sync frequency
    const syncFrequencies: number[] = [];
    for (const location of locations) {
      const history = this.getSyncHistory(location.id);
      if (history.length >= 2) {
        const lastSync = history[history.length - 1].lastSync;
        const previousSync = history[history.length - 2].lastSync;
        const frequency =
          (lastSync.getTime() - previousSync.getTime()) / (1000 * 60 * 60);
        syncFrequencies.push(frequency);
      }
    }

    const averageSyncFrequency =
      syncFrequencies.length > 0
        ? syncFrequencies.reduce((sum, f) => sum + f, 0) /
          syncFrequencies.length
        : 0;

    return {
      totalLocations: locations.length,
      activeLocations: activeLocations.length,
      totalTasks,
      tasksByLocation,
      averageSyncFrequency,
    };
  }
}

