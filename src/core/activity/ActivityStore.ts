/**
 * Activity Store (Zustand)
 * 
 * Global state management for activity events with caching and optimization.
 * Provides reactive updates and efficient data management.
 * 
 * Features:
 * - Caching of activity timelines
 * - Loading state management
 * - Optimistic updates
 * - Real-time sync support
 */

import React from 'react';
import { create } from 'zustand';
import { ActivityLogEntry, ActivityLogger } from './ActivityLogger';
import type { ActivityEntityType } from './activityTypes';

interface ActivityStore {
  /** Cached activities by entity key (entityType:entityId) */
  activities: Record<string, ActivityLogEntry[]>;
  
  /** Loading states by entity key */
  loading: Record<string, boolean>;
  
  /** Error states by entity key */
  errors: Record<string, string | null>;
  
  /** Last fetch timestamps for cache invalidation */
  lastFetched: Record<string, number>;
  
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTTL: number;
  
  // Actions
  /** Load timeline for an entity */
  loadTimeline: (
    entityType: ActivityEntityType | string,
    entityId: string,
    limit?: number,
    forceRefresh?: boolean
  ) => Promise<void>;
  
  /** Add activity to cache (optimistic update) */
  addActivity: (activity: ActivityLogEntry) => void;
  
  /** Clear timeline cache for an entity */
  clearTimeline: (entityType: ActivityEntityType | string, entityId: string) => void;
  
  /** Clear all caches */
  clearAll: () => void;
  
  /** Refresh timeline (force reload) */
  refreshTimeline: (
    entityType: ActivityEntityType | string,
    entityId: string,
    limit?: number
  ) => Promise<void>;
  
  /** Get activities for an entity (from cache) */
  getActivities: (
    entityType: ActivityEntityType | string,
    entityId: string
  ) => ActivityLogEntry[];
  
  /** Check if timeline is loading */
  isLoading: (
    entityType: ActivityEntityType | string,
    entityId: string
  ) => boolean;
  
  /** Check if cache is stale */
  isStale: (
    entityType: ActivityEntityType | string,
    entityId: string
  ) => boolean;
}

/**
 * Generate cache key from entity type and ID
 */
const getKey = (entityType: string, entityId: string): string => {
  return `${entityType}:${entityId}`;
};

/**
 * Activity Store
 * 
 * Zustand store for managing activity timeline state across the application.
 */
export const useActivityStore = create<ActivityStore>((set, get) => ({
  activities: {},
  loading: {},
  errors: {},
  lastFetched: {},
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  
  loadTimeline: async (
    entityType: string,
    entityId: string,
    limit: number = 50,
    forceRefresh: boolean = false
  ) => {
    const key = getKey(entityType, entityId);
    const state = get();
    
    // Check cache validity
    if (!forceRefresh && !state.isStale(entityType, entityId)) {
      // Cache is valid, no need to reload
      return;
    }
    
    // Set loading state
    set((prev) => ({
      loading: { ...prev.loading, [key]: true },
      errors: { ...prev.errors, [key]: null }
    }));
    
    try {
      const data = await ActivityLogger.getTimeline(entityType, entityId, limit);
      
      set((prev) => ({
        activities: { ...prev.activities, [key]: data },
        loading: { ...prev.loading, [key]: false },
        errors: { ...prev.errors, [key]: null },
        lastFetched: { ...prev.lastFetched, [key]: Date.now() }
      }));
    } catch (error) {
      console.error('Failed to load timeline:', error);
      set((prev) => ({
        loading: { ...prev.loading, [key]: false },
        errors: {
          ...prev.errors,
          [key]: error instanceof Error ? error.message : 'Failed to load activities'
        }
      }));
    }
  },
  
  addActivity: (activity: ActivityLogEntry) => {
    const key = getKey(activity.entityType, activity.entityId);
    
    set((prev) => {
      const existing = prev.activities[key] || [];
      
      // Check if activity already exists (avoid duplicates)
      const exists = existing.some(a => a.id === activity.id);
      if (exists) {
        return prev;
      }
      
      // Add to beginning of array (most recent first)
      return {
        activities: {
          ...prev.activities,
          [key]: [activity, ...existing]
        }
      };
    });
  },
  
  clearTimeline: (entityType: string, entityId: string) => {
    const key = getKey(entityType, entityId);
    
    set((prev) => {
      const newActivities = { ...prev.activities };
      const newLoading = { ...prev.loading };
      const newErrors = { ...prev.errors };
      const newLastFetched = { ...prev.lastFetched };
      
      delete newActivities[key];
      delete newLoading[key];
      delete newErrors[key];
      delete newLastFetched[key];
      
      return {
        activities: newActivities,
        loading: newLoading,
        errors: newErrors,
        lastFetched: newLastFetched
      };
    });
  },
  
  clearAll: () => {
    set({
      activities: {},
      loading: {},
      errors: {},
      lastFetched: {}
    });
  },
  
  refreshTimeline: async (
    entityType: string,
    entityId: string,
    limit: number = 50
  ) => {
    await get().loadTimeline(entityType, entityId, limit, true);
  },
  
  getActivities: (entityType: string, entityId: string): ActivityLogEntry[] => {
    const key = getKey(entityType, entityId);
    return get().activities[key] || [];
  },
  
  isLoading: (entityType: string, entityId: string): boolean => {
    const key = getKey(entityType, entityId);
    return get().loading[key] || false;
  },
  
  isStale: (entityType: string, entityId: string): boolean => {
    const key = getKey(entityType, entityId);
    const state = get();
    const lastFetched = state.lastFetched[key];
    
    if (!lastFetched) {
      return true; // Never fetched, consider stale
    }
    
    const age = Date.now() - lastFetched;
    return age > state.cacheTTL;
  }
}));

/**
 * Hook to use activity timeline with automatic loading
 * 
 * @example
 * ```tsx
 * const { activities, loading, error, refresh } = useActivityTimeline('customer', customerId);
 * ```
 */
export const useActivityTimeline = (
  entityType: ActivityEntityType | string,
  entityId: string,
  limit: number = 50,
  autoLoad: boolean = true
) => {
  const store = useActivityStore();
  const key = `${entityType}:${entityId}`;
  
  // Auto-load on mount if enabled
  React.useEffect(() => {
    if (autoLoad && entityId) {
      store.loadTimeline(entityType, entityId, limit);
    }
  }, [entityType, entityId, limit, autoLoad, store]);
  
  return {
    activities: store.getActivities(entityType, entityId),
    loading: store.isLoading(entityType, entityId),
    error: store.errors[key] || null,
    refresh: () => store.refreshTimeline(entityType, entityId, limit),
    addActivity: store.addActivity,
    clearTimeline: () => store.clearTimeline(entityType, entityId)
  };
};

