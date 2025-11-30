/**
 * Fabricator Collaboration Context
 * Real-time multi-user workspace with live synchronization
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { WindowUnit, Profile } from '@/types/fabricator';

export interface Collaborator {
  id: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  currentProjectId?: string;
  cursor?: {
    x: number;
    y: number;
    element?: string;
  };
  selection?: {
    type: 'component' | 'profile' | 'cut';
    id: string;
  };
  lastSeen: Date;
}

export interface CollaborationState {
  collaborators: Collaborator[];
  currentUser: Collaborator | null;
  isConnected: boolean;
  conflictResolution: 'manual' | 'automatic' | 'last-write-wins';
}

interface CollaborationContextValue {
  state: CollaborationState;
  updateCursor: (x: number, y: number, element?: string) => void;
  updateSelection: (type: 'component' | 'profile' | 'cut', id: string) => void;
  broadcastEdit: (projectId: string, edit: any) => Promise<void>;
  resolveConflict: (conflict: any) => Promise<void>;
}

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

interface FabricatorCollaborationProviderProps {
  children: React.ReactNode;
  userId: string;
  userName: string;
  currentProjectId?: string;
}

export const FabricatorCollaborationProvider: React.FC<FabricatorCollaborationProviderProps> = ({
  children,
  userId,
  userName,
  currentProjectId,
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);
  const cursorUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize current user
  const currentUser: Collaborator = {
    id: `collab-${userId}`,
    userId,
    userName,
    currentProjectId,
    lastSeen: new Date(),
  };

  /**
   * Update cursor position (throttled)
   */
  const updateCursor = useCallback((x: number, y: number, element?: string) => {
    if (cursorUpdateTimeoutRef.current) {
      clearTimeout(cursorUpdateTimeoutRef.current);
    }

    cursorUpdateTimeoutRef.current = setTimeout(() => {
      if (channelRef.current && currentProjectId) {
        channelRef.current.send({
          type: 'cursor',
          payload: {
            userId,
            x,
            y,
            element,
            projectId: currentProjectId,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }, 100); // Throttle to 10 updates per second
  }, [userId, currentProjectId]);

  /**
   * Update selection
   */
  const updateSelection = useCallback((type: 'component' | 'profile' | 'cut', id: string) => {
    if (channelRef.current && currentProjectId) {
      channelRef.current.send({
        type: 'selection',
        payload: {
          userId,
          selection: { type, id },
          projectId: currentProjectId,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, [userId, currentProjectId]);

  /**
   * Broadcast edit to collaborators
   */
  const broadcastEdit = useCallback(async (projectId: string, edit: any) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'edit',
        payload: {
          userId,
          projectId,
          edit,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, [userId]);

  /**
   * Resolve conflict using operational transform
   */
  const resolveConflict = useCallback(async (conflict: any) => {
    // Simple last-write-wins for now
    // In production, implement proper operational transform
    console.log('Resolving conflict:', conflict);
    
    // Apply the most recent edit
    if (conflict.edits && conflict.edits.length > 0) {
      const latestEdit = conflict.edits.sort(
        (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      // Apply edit (would integrate with workspace context)
      return latestEdit;
    }
  }, []);

  // Setup real-time subscription
  useEffect(() => {
    if (!currentProjectId) return;

    // Subscribe to project channel
    const channel = supabase.channel(`fabricator-project-${currentProjectId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Track presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const collaboratorList: Collaborator[] = [];

        for (const [key, presences] of Object.entries(presenceState)) {
          for (const presence of presences as any[]) {
            collaboratorList.push({
              id: key,
              userId: presence.userId || key,
              userName: presence.userName || 'Unknown',
              avatarUrl: presence.avatarUrl,
              currentProjectId: presence.projectId,
              cursor: presence.cursor,
              selection: presence.selection,
              lastSeen: new Date(presence.lastSeen || Date.now()),
            });
          }
        }

        setCollaborators(collaboratorList);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Track own presence
    channel.track({
      userId,
      userName,
      projectId: currentProjectId,
      lastSeen: new Date().toISOString(),
    });

    // Listen for cursor updates
    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      if (payload.userId !== userId) {
        setCollaborators(prev => prev.map(collab =>
          collab.userId === payload.userId
            ? { ...collab, cursor: { x: payload.x, y: payload.y, element: payload.element } }
            : collab
        ));
      }
    });

    // Listen for selection updates
    channel.on('broadcast', { event: 'selection' }, ({ payload }) => {
      if (payload.userId !== userId) {
        setCollaborators(prev => prev.map(collab =>
          collab.userId === payload.userId
            ? { ...collab, selection: payload.selection }
            : collab
        ));
      }
    });

    // Listen for edits
    channel.on('broadcast', { event: 'edit' }, ({ payload }) => {
      if (payload.userId !== userId) {
        // Handle remote edit (would integrate with workspace context)
        console.log('Remote edit received:', payload);
      }
    });

    channelRef.current = channel;

    // Update presence periodically
    const presenceInterval = setInterval(() => {
      channel.track({
        userId,
        userName,
        projectId: currentProjectId,
        lastSeen: new Date().toISOString(),
      });
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(presenceInterval);
      channel.untrack();
      channel.unsubscribe();
      if (cursorUpdateTimeoutRef.current) {
        clearTimeout(cursorUpdateTimeoutRef.current);
      }
    };
  }, [userId, userName, currentProjectId]);

  const value: CollaborationContextValue = {
    state: {
      collaborators,
      currentUser,
      isConnected,
      conflictResolution: 'last-write-wins', // Configurable
    },
    updateCursor,
    updateSelection,
    broadcastEdit,
    resolveConflict,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
};

export const useFabricatorCollaboration = (): CollaborationContextValue => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useFabricatorCollaboration must be used within FabricatorCollaborationProvider');
  }
  return context;
};

