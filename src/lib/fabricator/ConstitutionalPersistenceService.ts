/**
 * Constitutional Persistence Service – single persistence boundary for Fabricator.
 * Validates, writes to v2, updates React Query cache, optional local backup, RealityOS emission.
 *
 * Constitutional Tier: Tier 3 (Protected Determinism)
 * AICS-001 §7.4 (Audit Trail Doctrine)
 */

import { realityOSEventEmitter } from '@/lib/realityos/RealityOSEventEmitter';
import { fabricatorClientV2 } from '@/lib/supabase/fabricatorClientV2';
import type { WindowUnit } from '@/types/fabricator';
import type { QueryClient } from '@tanstack/react-query';

const FABRICATOR_QUERY_KEY = ['fabricator', 'v2'];
const LOCAL_BACKUP_KEY = 'almona_constitutional_pose_backup';

export interface ProofContext {
  verifiedBy: string;
  timestamp?: string;
  designMode?: 'smartdraw' | 'drafting';
  [key: string]: unknown;
}

export interface SavePoseResult {
  projectId: string;
  poseId: string;
  backupSaved: boolean;
  eventEmitted: boolean;
}

function validateWindowUnit(unit: WindowUnit): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!unit?.id) errors.push('id is required');
  if (unit.overallWidth != null && (typeof unit.overallWidth !== 'number' || unit.overallWidth < 0))
    errors.push('overallWidth must be a non-negative number');
  if (unit.overallHeight != null && (typeof unit.overallHeight !== 'number' || unit.overallHeight < 0))
    errors.push('overallHeight must be a non-negative number');
  return { valid: errors.length === 0, errors };
}

/**
 * Single persistence boundary: validate, write v2, update cache, optional backup, RealityOS.
 */
export async function savePose(
  windowUnit: WindowUnit,
  proofContext: ProofContext,
  options: {
    queryClient?: QueryClient | null;
    grid?: Record<string, unknown>;
    selectedPreset?: string;
    localBackup?: boolean;
    emitRealityOS?: boolean;
  } = {}
): Promise<SavePoseResult> {
  const { queryClient, grid, selectedPreset, localBackup = true, emitRealityOS = true } = options;

  const validation = validateWindowUnit(windowUnit);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  const userId = await fabricatorClientV2.getUserId();
  const { projectId, poseId } = await fabricatorClientV2.savePose(windowUnit, userId, {
    grid,
    selectedPreset,
  });

  if (queryClient) {
    void queryClient.invalidateQueries({ queryKey: [...FABRICATOR_QUERY_KEY, 'projects'] });
    void queryClient.invalidateQueries({ queryKey: [...FABRICATOR_QUERY_KEY, 'positions'] });
    void queryClient.invalidateQueries({ queryKey: [...FABRICATOR_QUERY_KEY, 'pose', poseId] });
  }

  let backupSaved = false;
  if (localBackup && typeof localStorage !== 'undefined') {
    try {
      const payload = {
        poseId,
        projectId,
        windowUnit,
        grid: grid ?? {},
        savedAt: new Date().toISOString(),
        userId,
      };
      localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(payload));
      backupSaved = true;
    } catch {
      // non-blocking
    }
  }

  let eventEmitted = false;
  if (emitRealityOS) {
    try {
      const result = await realityOSEventEmitter.emitFabricationIntentCreated(
        windowUnit,
        proofContext.verifiedBy
      );
      eventEmitted = result.success;
    } catch {
      // non-blocking
    }
  }

  return { projectId, poseId, backupSaved, eventEmitted };
}

/**
 * Load pose by id (delegate to v2 client).
 */
export async function loadPose(poseId: string): Promise<WindowUnit | null> {
  const userId = await fabricatorClientV2.getUserId();
  return fabricatorClientV2.getPose(poseId, userId);
}
