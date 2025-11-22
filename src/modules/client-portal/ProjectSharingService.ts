/**
 * ProjectSharingService - Handles link generation, email notifications
 * Creates secure, unique links for sharing projects with clients
 */

import { WindowUnit } from '@/types/fabricator';

export interface SharedProject {
  id: string;
  projectId: string;
  shareToken: string;
  shareUrl: string;
  clientEmail?: string;
  clientName?: string;
  expiresAt: Date;
  createdAt: Date;
  accessedAt?: Date;
  accessCount: number;
  status: 'active' | 'expired' | 'revoked';
  permissions: {
    canView: boolean;
    canComment: boolean;
    canApprove: boolean;
    canDownload: boolean;
  };
}

export class ProjectSharingService {
  private baseUrl: string;

  constructor(baseUrl: string = window.location.origin) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate a secure share token
   */
  private generateShareToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Create a shared project link
   */
  createShareLink(
    project: WindowUnit,
    options: {
      clientEmail?: string;
      clientName?: string;
      expiresInDays?: number;
      permissions?: Partial<SharedProject['permissions']>;
    } = {}
  ): SharedProject {
    const shareToken = this.generateShareToken();
    const expiresInDays = options.expiresInDays || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const defaultPermissions: SharedProject['permissions'] = {
      canView: true,
      canComment: true,
      canApprove: true,
      canDownload: true,
    };

    const sharedProject: SharedProject = {
      id: `share_${Date.now()}`,
      projectId: project.id,
      shareToken,
      shareUrl: `${this.baseUrl}/client/view/${shareToken}`,
      clientEmail: options.clientEmail,
      clientName: options.clientName,
      expiresAt,
      createdAt: new Date(),
      accessCount: 0,
      status: 'active',
      permissions: { ...defaultPermissions, ...options.permissions },
    };

    // In a real implementation, this would be saved to a database
    this.saveSharedProject(sharedProject);

    return sharedProject;
  }

  /**
   * Send email notification (mock implementation)
   */
  async sendShareNotification(sharedProject: SharedProject): Promise<boolean> {
    // In a real implementation, this would send an email via an email service
    console.log('Sending share notification:', {
      to: sharedProject.clientEmail,
      url: sharedProject.shareUrl,
      projectId: sharedProject.projectId,
    });

    // Mock email sending
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 500);
    });
  }

  /**
   * Revoke a share link
   */
  revokeShareLink(shareToken: string): boolean {
    const shared = this.getSharedProject(shareToken);
    if (shared) {
      shared.status = 'revoked';
      this.saveSharedProject(shared);
      return true;
    }
    return false;
  }

  /**
   * Get shared project by token
   */
  getSharedProject(shareToken: string): SharedProject | null {
    const stored = localStorage.getItem(`shared_project_${shareToken}`);
    if (stored) {
      const shared = JSON.parse(stored);
      // Check if expired
      if (new Date(shared.expiresAt) < new Date()) {
        shared.status = 'expired';
        this.saveSharedProject(shared);
        return null;
      }
      return shared;
    }
    return null;
  }

  /**
   * Track access to shared project
   */
  trackAccess(shareToken: string): void {
    const shared = this.getSharedProject(shareToken);
    if (shared && shared.status === 'active') {
      shared.accessCount++;
      shared.accessedAt = new Date();
      this.saveSharedProject(shared);
    }
  }

  /**
   * Save shared project to storage (mock - would use database in production)
   */
  private saveSharedProject(shared: SharedProject): void {
    localStorage.setItem(`shared_project_${shared.shareToken}`, JSON.stringify(shared));
  }

  /**
   * Get all shared projects for a project
   */
  getSharedProjectsForProject(projectId: string): SharedProject[] {
    const sharedProjects: SharedProject[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('shared_project_')) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const shared = JSON.parse(stored);
          if (shared.projectId === projectId) {
            sharedProjects.push(shared);
          }
        }
      }
    }
    return sharedProjects;
  }
}

