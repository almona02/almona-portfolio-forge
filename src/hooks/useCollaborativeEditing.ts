/**
 * useCollaborativeEditing Hook
 * Conflict resolution logic for concurrent edits
 */

import { useState, useCallback, useRef } from 'react';
import { useFabricatorCollaboration } from '@/contexts/FabricatorCollaborationContext';
import type { WindowUnit } from '@/types/fabricator';

export interface EditOperation {
  type: 'add' | 'update' | 'delete';
  path: string; // JSON path to edited field
  value: any;
  timestamp: number;
  userId: string;
}

export interface Conflict {
  localEdit: EditOperation;
  remoteEdit: EditOperation;
  resolved: boolean;
}

export function useCollaborativeEditing(projectId: string) {
  const { broadcastEdit, resolveConflict } = useFabricatorCollaboration();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const editQueueRef = useRef<EditOperation[]>([]);
  const lastAppliedEditRef = useRef<number>(0);

  /**
   * Apply local edit with conflict detection
   */
  const applyEdit = useCallback(async (
    operation: Omit<EditOperation, 'timestamp' | 'userId'>
  ) => {
    const edit: EditOperation = {
      ...operation,
      timestamp: Date.now(),
      userId: 'current-user', // Would come from auth context
    };

    // Check for conflicts
    const conflictingEdit = editQueueRef.current.find(
      e => e.path === edit.path && e.timestamp > lastAppliedEditRef.current
    );

    if (conflictingEdit && conflictingEdit.userId !== edit.userId) {
      // Conflict detected
      const conflict: Conflict = {
        localEdit: edit,
        remoteEdit: conflictingEdit,
        resolved: false,
      };

      setConflicts(prev => [...prev, conflict]);

      // Try automatic resolution
      const resolved = await resolveConflict({
        edits: [edit, conflictingEdit],
      });

      if (resolved) {
        setConflicts(prev => prev.filter(c => c !== conflict));
        lastAppliedEditRef.current = Math.max(edit.timestamp, conflictingEdit.timestamp);
      }
    } else {
      // No conflict, apply immediately
      lastAppliedEditRef.current = edit.timestamp;
    }

    // Broadcast edit
    await broadcastEdit(projectId, edit);

    // Add to queue
    editQueueRef.current.push(edit);
  }, [projectId, broadcastEdit, resolveConflict]);

  /**
   * Handle remote edit
   */
  const handleRemoteEdit = useCallback((edit: EditOperation) => {
    // Add to queue
    editQueueRef.current.push(edit);

    // Check for conflicts with pending local edits
    const localPending = editQueueRef.current.filter(
      e => e.userId === 'current-user' && e.timestamp > lastAppliedEditRef.current
    );

    const conflicting = localPending.find(
      e => e.path === edit.path && Math.abs(e.timestamp - edit.timestamp) < 5000 // 5s window
    );

    if (conflicting) {
      const conflict: Conflict = {
        localEdit: conflicting,
        remoteEdit: edit,
        resolved: false,
      };

      setConflicts(prev => [...prev, conflict]);
    } else {
      // No conflict, apply remote edit
      lastAppliedEditRef.current = Math.max(lastAppliedEditRef.current, edit.timestamp);
    }
  }, []);

  /**
   * Manually resolve conflict
   */
  const manualResolveConflict = useCallback(async (
    conflict: Conflict,
    resolution: 'local' | 'remote' | 'merge'
  ) => {
    if (resolution === 'local') {
      // Keep local edit
      lastAppliedEditRef.current = conflict.localEdit.timestamp;
    } else if (resolution === 'remote') {
      // Use remote edit
      lastAppliedEditRef.current = conflict.remoteEdit.timestamp;
    } else {
      // Merge (would implement merge logic)
      lastAppliedEditRef.current = Math.max(
        conflict.localEdit.timestamp,
        conflict.remoteEdit.timestamp
      );
    }

    setConflicts(prev => prev.filter(c => c !== conflict));
  }, []);

  return {
    applyEdit,
    handleRemoteEdit,
    conflicts,
    manualResolveConflict,
  };
}

