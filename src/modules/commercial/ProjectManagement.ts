/**
 * Project Timeline and Management System
 * Tracks project progress, milestones, and deadlines
 */

import { WindowUnit } from '@/types/fabricator';

export interface ProjectMilestone {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dueDate: Date;
  completedDate?: Date;
  dependencies: string[]; // IDs of other milestones
  assignedTo?: string;
}

export interface ProjectTimeline {
  projectId: string;
  startDate: Date;
  endDate: Date;
  milestones: ProjectMilestone[];
  currentPhase: 'design' | 'optimization' | 'production' | 'quality' | 'delivery' | 'installation';
  progress: number; // 0-100
  estimatedCompletion: Date;
  actualCompletion?: Date;
}

export interface ResourceAllocation {
  resourceId: string;
  resourceType: 'machine' | 'worker' | 'material';
  allocatedHours: number;
  startDate: Date;
  endDate: Date;
  status: 'allocated' | 'in_use' | 'completed';
}

export class ProjectManagement {
  private timelines: Map<string, ProjectTimeline> = new Map();
  private resourceAllocations: Map<string, ResourceAllocation[]> = new Map();

  /**
   * Create timeline for project
   */
  createTimeline(project: WindowUnit): ProjectTimeline {
    const milestones: ProjectMilestone[] = [
      {
        id: 'design',
        name: 'Design & Specification',
        description: 'Complete window design and component specification',
        status: project.status === 'design' ? 'in_progress' : 'pending',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
        dependencies: [],
      },
      {
        id: 'optimization',
        name: 'Cutting Optimization',
        description: 'Generate optimized cutting plan',
        status: project.status === 'optimized' ? 'completed' : 'pending',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        dependencies: ['design'],
      },
      {
        id: 'production',
        name: 'Production',
        description: 'Manufacture window components',
        status: project.status === 'production' ? 'in_progress' : 'pending',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
        dependencies: ['optimization'],
      },
      {
        id: 'quality',
        name: 'Quality Control',
        description: 'Inspection and quality verification',
        status: 'pending',
        dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days
        dependencies: ['production'],
      },
      {
        id: 'delivery',
        name: 'Delivery',
        description: 'Package and ship to customer',
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        dependencies: ['quality'],
      },
    ];

    const progress = this.calculateProgress(milestones);
    const estimatedCompletion = milestones[milestones.length - 1].dueDate;

    const timeline: ProjectTimeline = {
      projectId: project.id,
      startDate: project.createdAt,
      endDate: estimatedCompletion,
      milestones,
      currentPhase: this.getCurrentPhase(project.status),
      progress,
      estimatedCompletion,
    };

    this.timelines.set(project.id, timeline);
    return timeline;
  }

  /**
   * Update milestone status
   */
  updateMilestone(
    projectId: string,
    milestoneId: string,
    status: ProjectMilestone['status']
  ): void {
    const timeline = this.timelines.get(projectId);
    if (!timeline) return;

    const milestone = timeline.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return;

    milestone.status = status;
    if (status === 'completed') {
      milestone.completedDate = new Date();
    }

    timeline.progress = this.calculateProgress(timeline.milestones);
    this.timelines.set(projectId, timeline);
  }

  /**
   * Get project timeline
   */
  getTimeline(projectId: string): ProjectTimeline | undefined {
    return this.timelines.get(projectId);
  }

  /**
   * Check if project is on schedule
   */
  isOnSchedule(projectId: string): boolean {
    const timeline = this.timelines.get(projectId);
    if (!timeline) return false;

    const now = new Date();
    const overdueMilestones = timeline.milestones.filter(
      (m) => m.status !== 'completed' && m.dueDate < now
    );

    return overdueMilestones.length === 0;
  }

  /**
   * Get delayed milestones
   */
  getDelayedMilestones(projectId: string): ProjectMilestone[] {
    const timeline = this.timelines.get(projectId);
    if (!timeline) return [];

    const now = new Date();
    return timeline.milestones.filter(
      (m) => m.status !== 'completed' && m.dueDate < now
    );
  }

  /**
   * Allocate resources to project
   */
  allocateResource(
    projectId: string,
    allocation: ResourceAllocation
  ): void {
    const allocations = this.resourceAllocations.get(projectId) || [];
    allocations.push(allocation);
    this.resourceAllocations.set(projectId, allocations);
  }

  /**
   * Get resource allocations for project
   */
  getResourceAllocations(projectId: string): ResourceAllocation[] {
    return this.resourceAllocations.get(projectId) || [];
  }

  /**
   * Calculate project progress
   */
  private calculateProgress(milestones: ProjectMilestone[]): number {
    if (milestones.length === 0) return 0;

    const completed = milestones.filter((m) => m.status === 'completed').length;
    const inProgress = milestones.filter((m) => m.status === 'in_progress').length;

    // Completed milestones count as 100%, in-progress as 50%
    return ((completed + inProgress * 0.5) / milestones.length) * 100;
  }

  /**
   * Get current phase from project status
   */
  private getCurrentPhase(
    status: WindowUnit['status']
  ): ProjectTimeline['currentPhase'] {
    switch (status) {
      case 'design':
        return 'design';
      case 'optimized':
        return 'optimization';
      case 'production':
        return 'production';
      default:
        return 'design';
    }
  }

  /**
   * Estimate completion date based on current progress
   */
  estimateCompletion(projectId: string): Date | null {
    const timeline = this.timelines.get(projectId);
    if (!timeline) return null;

    const remainingMilestones = timeline.milestones.filter(
      (m) => m.status !== 'completed'
    );

    if (remainingMilestones.length === 0) {
      return timeline.estimatedCompletion;
    }

    const avgDaysPerMilestone = 2;
    const estimatedDays = remainingMilestones.length * avgDaysPerMilestone;
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + estimatedDays);

    return completionDate;
  }

  /**
   * Get all projects with their timelines
   */
  getAllTimelines(): ProjectTimeline[] {
    return Array.from(this.timelines.values());
  }

  /**
   * Get projects by status
   */
  getProjectsByPhase(phase: ProjectTimeline['currentPhase']): ProjectTimeline[] {
    return Array.from(this.timelines.values()).filter(
      (t) => t.currentPhase === phase
    );
  }
}

