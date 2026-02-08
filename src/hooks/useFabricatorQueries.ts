/**
 * React Query hooks for Fabricator v2 (canonical data layer).
 * Use when FeatureFlags.FABRICATOR_READ_V2 is true.
 */

import { useAuth } from '@/context/AuthContext';
import { fabricatorClientV2, mapPositionRowToWindowUnit } from '@/lib/supabase/fabricatorClientV2';
import type { WindowUnit } from '@/types/fabricator';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

const FABRICATOR_KEY = ['fabricator', 'v2'] as const;

/**
 * Cache tuning constants.
 *
 * staleTime  — How long data is considered "fresh" before a background
 *              refetch is triggered.  For fabricator data that changes
 *              only on explicit user saves, 30s is a safe default.
 *
 * gcTime     — How long inactive cache entries are kept in memory.
 *              5 minutes prevents redundant network fetches when users
 *              navigate back and forth between views.
 */
const STALE_TIME = 30_000;   // 30 seconds
const GC_TIME   = 300_000;   // 5 minutes

export function useProjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...FABRICATOR_KEY, 'projects', user?.id ?? ''],
    queryFn: () => fabricatorClientV2.listProjects(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function useProject(projectId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...FABRICATOR_KEY, 'project', projectId ?? '', user?.id ?? ''],
    queryFn: () => fabricatorClientV2.getProject(projectId!, user!.id),
    enabled: !!user?.id && !!projectId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });
}

export function usePositions(projectId: string | undefined | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...FABRICATOR_KEY, 'positions', projectId ?? 'all', user?.id ?? ''],
    queryFn: () => fabricatorClientV2.listPositions(user!.id, projectId ?? undefined),
    enabled: !!user?.id,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    // Keep previous data visible while refetching (prevents flash of empty state)
    placeholderData: (prev: unknown) => prev,
  });
}

export function usePose(poseId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...FABRICATOR_KEY, 'pose', poseId ?? '', user?.id ?? ''],
    queryFn: () => fabricatorClientV2.getPose(poseId!, user!.id),
    enabled: !!user?.id && !!poseId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    placeholderData: (prev: unknown) => prev,
  });
}

export function useUpsertPose() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      windowUnit: WindowUnit;
      grid?: Record<string, unknown>;
      selectedPreset?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      return fabricatorClientV2.savePose(
        payload.windowUnit,
        user.id,
        { grid: payload.grid, selectedPreset: payload.selectedPreset }
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: [...FABRICATOR_KEY, 'projects'] });
      void queryClient.invalidateQueries({ queryKey: [...FABRICATOR_KEY, 'positions'] });
      void queryClient.invalidateQueries({
        queryKey: [...FABRICATOR_KEY, 'pose', variables.windowUnit.id],
      });
    },
  });
}

export function useDeletePose() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (poseId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return fabricatorClientV2.deletePose(poseId, user.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...FABRICATOR_KEY, 'projects'] });
      void queryClient.invalidateQueries({ queryKey: [...FABRICATOR_KEY, 'positions'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      return fabricatorClientV2.deleteProject(projectId, user.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...FABRICATOR_KEY, 'projects'] });
      void queryClient.invalidateQueries({ queryKey: [...FABRICATOR_KEY, 'positions'] });
    },
  });
}

// ─── Convenience hooks (Phase 2 — Data Pipeline Unification) ──────

/**
 * Load all positions for a project as mapped WindowUnit[].
 *
 * This is the hook ProjectStudio, EngineeringBayWrapper, and PoseSwitcher
 * should use when they need sibling positions ready for display.
 */
export function useProjectPositions(projectId: string | undefined) {
  const { data: rows = [] } = usePositions(projectId ?? null);

  return useMemo(
    () => rows
      .map((row: any) => mapPositionRowToWindowUnit(row))
      .filter((wu): wu is WindowUnit => wu !== null),
    [rows],
  );
}

/**
 * Update project-level metadata (name, customer, site, status, meta).
 * Used by the Project Header Editor (Phase 3e).
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      projectId: string;
      updates: {
        project_name?: string;
        client_name?: string;
        site_name?: string;
        status?: string;
        meta?: Record<string, unknown>;
      };
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      return fabricatorClientV2.updateProject(
        payload.projectId,
        user.id,
        payload.updates
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: [...FABRICATOR_KEY, 'projects'] });
      void queryClient.invalidateQueries({
        queryKey: [...FABRICATOR_KEY, 'project', variables.projectId],
      });
    },
  });
}
