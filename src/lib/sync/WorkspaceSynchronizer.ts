/**
 * Workspace Synchronizer
 * Supabase real-time subscriptions for workspace synchronization
 */

import { supabase } from '../supabase';
import type { FabricatorWorkspaceState } from '@/context/FabricatorWorkspaceContext';

export interface SyncEvent {
  type: 'update' | 'delete' | 'create';
  entity: 'project' | 'profile' | 'inventory' | 'calibration';
  data: any;
  userId: string;
  timestamp: Date;
}

export class WorkspaceSynchronizer {
  private channels: Map<string, any> = new Map();
  private listeners: Map<string, Set<(event: SyncEvent) => void>> = new Map();

  /**
   * Subscribe to workspace changes for a project
   */
  subscribeToProject(
    projectId: string,
    userId: string,
    onUpdate: (event: SyncEvent) => void
  ): () => void {
    const channelName = `workspace-project-${projectId}`;
    
    // Remove existing subscription if any
    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = supabase.channel(channelName);

    // Listen for workspace updates
    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fabricator_workspace_snapshots',
          filter: `project_id=eq.${projectId}`,
        },
        (payload: any) => {
          const event: SyncEvent = {
            type: payload.eventType as any,
            entity: 'project',
            data: payload.new || payload.old,
            userId: payload.new?.user_id || userId,
            timestamp: new Date(),
          };

          onUpdate(event);
          this.notifyListeners(channelName, event);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    // Register listener
    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, new Set());
    }
    this.listeners.get(channelName)!.add(onUpdate);

    // Return unsubscribe function
    return () => {
      this.listeners.get(channelName)?.delete(onUpdate);
      if (this.listeners.get(channelName)?.size === 0) {
        channel.unsubscribe();
        this.channels.delete(channelName);
        this.listeners.delete(channelName);
      }
    };
  }

  /**
   * Subscribe to profile changes
   */
  subscribeToProfiles(
    userId: string,
    onUpdate: (event: SyncEvent) => void
  ): () => void {
    const channelName = `workspace-profiles-${userId}`;

    if (this.channels.has(channelName)) {
      this.channels.get(channelName)?.unsubscribe();
    }

    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fabricator_profiles',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          const event: SyncEvent = {
            type: payload.eventType as any,
            entity: 'profile',
            data: payload.new || payload.old,
            userId,
            timestamp: new Date(),
          };

          onUpdate(event);
          this.notifyListeners(channelName, event);
        }
      )
      .subscribe();

    this.channels.set(channelName, channel);

    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, new Set());
    }
    this.listeners.get(channelName)!.add(onUpdate);

    return () => {
      this.listeners.get(channelName)?.delete(onUpdate);
      if (this.listeners.get(channelName)?.size === 0) {
        channel.unsubscribe();
        this.channels.delete(channelName);
        this.listeners.delete(channelName);
      }
    };
  }

  /**
   * Broadcast workspace update
   */
  async broadcastUpdate(projectId: string, update: Partial<FabricatorWorkspaceState>): Promise<void> {
    const channelName = `workspace-project-${projectId}`;
    const channel = this.channels.get(channelName);

    if (channel) {
      channel.send({
        type: 'workspace_update',
        payload: {
          projectId,
          update,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Notify all listeners for a channel
   */
  private notifyListeners(channelName: string, event: SyncEvent): void {
    const listeners = this.listeners.get(channelName);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in sync listener:', error);
        }
      });
    }
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeAll(): void {
    for (const [name, channel] of this.channels.entries()) {
      channel.unsubscribe();
    }
    this.channels.clear();
    this.listeners.clear();
  }
}

// Export singleton instance
export const workspaceSynchronizer = new WorkspaceSynchronizer();

