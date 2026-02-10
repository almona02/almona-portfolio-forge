/**
 * Fabricator v2 Supabase client: canonical read/write for fabricator_projects_v2 and fabricator_positions_v2.
 * Used by React Query hooks as the single data layer when FABRICATOR_READ_V2 is true.
 */

import type { Database } from '@/types/database';
import type { WindowUnit } from '@/types/fabricator';
import { supabase } from '../supabase';

type ProjectV2Insert = Database['public']['Tables']['fabricator_projects_v2']['Insert'];
type PositionV2Row = Database['public']['Tables']['fabricator_positions_v2']['Row'];
type PositionV2Insert = Database['public']['Tables']['fabricator_positions_v2']['Insert'];
type PositionV2Update = Database['public']['Tables']['fabricator_positions_v2']['Update'];

export interface FabricatorProjectV2 {
  id: string;
  owner_user_id: string;
  project_code: string;
  project_name: string;
  client_name: string;
  site_name: string | null;
  status: string;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface FabricatorPositionV2 {
  id: string;
  project_id: string | null;
  owner_user_id: string;
  order_number: string | null;
  pos_number: string | null;
  type: string | null;
  overall_width_mm: number | null;
  overall_height_mm: number | null;
  status: string;
  quantity: number;
  window_unit: Record<string, unknown> | null;
  components: unknown;
  grid: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/** Map v2 position row to WindowUnit for UI (exported for use in hooks/components). */
export function mapPositionRowToWindowUnit(row: PositionV2Row): WindowUnit | null {
  const wu = row.window_unit as Record<string, unknown> | null;
  if (!wu) return null;
  const components = (row.components ?? wu.components ?? []) as WindowUnit['components'];
  return {
    id: row.id,
    orderNumber: (wu.orderNumber as string) ?? row.order_number ?? '',
    posNumber: (wu.posNumber as string) ?? row.pos_number ?? '',
    type: (wu.type as string) ?? row.type ?? '',
    components: Array.isArray(components) ? components : [],
    overallWidth: (wu.overallWidth as number) ?? row.overall_width_mm ?? 0,
    overallHeight: (wu.overallHeight as number) ?? row.overall_height_mm ?? 0,
    color: (wu.color as string) ?? row.color ?? '',
    glazing: (wu.glazing as WindowUnit['glazing']) ?? row.glazing ?? {},
    hardware: (Array.isArray(wu.hardware) ? wu.hardware : []) as WindowUnit['hardware'],
    status: (wu.status as WindowUnit['status']) ?? row.status ?? 'measuring',
    optimization: (row.optimization ?? wu.optimization) as WindowUnit['optimization'],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    customer: (wu.customer as string) ?? undefined,
    projectCode: (wu.projectCode as string) ?? undefined,
    positionMeta: (row.position_meta ?? wu.positionMeta ?? {}) as WindowUnit['positionMeta'],
    quantity: row.quantity ?? 1,
    systemPackId: (row.system_pack_id ?? wu.systemPackId) as string | undefined,
    projectId: (row.project_id ?? wu.projectId) ?? undefined,
  } as WindowUnit;
}

// Helper to validate UUID format
const isUuid = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const fabricatorClientV2 = {
  async getUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('User not authenticated');
    return user.id;
  },

  async listProjects(ownerUserId: string): Promise<FabricatorProjectV2[]> {
    const { data, error } = await supabase
      .from('fabricator_projects_v2')
      .select('*')
      .eq('owner_user_id', ownerUserId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as FabricatorProjectV2[];
  },

  async getProject(projectId: string, ownerUserId: string): Promise<FabricatorProjectV2 | null> {
    // Validate UUID to prevent 400 Bad Request
    if (!isUuid(projectId)) return null;

    const { data, error } = await supabase
      .from('fabricator_projects_v2')
      .select('*')
      .eq('id', projectId)
      .eq('owner_user_id', ownerUserId)
      .maybeSingle();
    if (error) throw error;
    return data as FabricatorProjectV2 | null;
  },

  async listPositions(ownerUserId: string, projectId?: string | null): Promise<PositionV2Row[]> {
    let q = supabase
      .from('fabricator_positions_v2')
      .select('*')
      .eq('owner_user_id', ownerUserId)
      .order('updated_at', { ascending: false });
    
    if (projectId) {
      // If projectId provided but not UUID, return empty (or ignore filter? safer to return empty for strict correctness)
      if (!isUuid(projectId)) return [];
      q = q.eq('project_id', projectId);
    }
    
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as PositionV2Row[];
  },

  async getPose(poseId: string, ownerUserId: string): Promise<WindowUnit | null> {
    // Validate UUID
    if (!isUuid(poseId)) return null;

    const { data, error } = await supabase
      .from('fabricator_positions_v2')
      .select('*')
      .eq('id', poseId)
      .eq('owner_user_id', ownerUserId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapPositionRowToWindowUnit(data as PositionV2Row);
  },

  /** Atomic save: upsert project + position from WindowUnit; returns saved pose id. */
  async savePose(
    windowUnit: WindowUnit,
    ownerUserId: string,
    options?: { grid?: Record<string, unknown>; selectedPreset?: string }
  ): Promise<{ projectId: string; poseId: string }> {
    const projectCode = windowUnit.projectCode || windowUnit.orderNumber;
    const baseProject: Omit<ProjectV2Insert, 'id'> = {
      owner_user_id: ownerUserId,
      project_code: projectCode,
      project_name: projectCode,
      client_name: windowUnit.customer ?? 'Fabricator Client',
      site_name: (windowUnit.positionMeta as Record<string, unknown>)?.elevation as string ?? null,
      currency: 'EGP',
      region: 'global',
      system_pack_id: windowUnit.systemPackId ?? 'rock60',
      status: windowUnit.status ?? 'draft',
      meta: {},
    };

    // Look up project by CODE (not ID) to avoid UUID issues
    const { data: existingProject } = await supabase
      .from('fabricator_projects_v2')
      .select('id')
      .eq('project_code', projectCode)
      .eq('owner_user_id', ownerUserId)
      .maybeSingle();

    let projectId: string;
    if (existingProject?.id) {
      projectId = existingProject.id;
    } else {
      const { data: inserted, error: projErr } = await supabase
        .from('fabricator_projects_v2')
        .insert(baseProject as ProjectV2Insert)
        .select('id')
        .single();
      if (projErr || !inserted?.id) throw new Error(projErr?.message ?? 'Failed to create project');
      projectId = inserted.id;
    }

    const now = new Date().toISOString();
    const positionPayload: PositionV2Update & Partial<PositionV2Insert> = {
      project_id: projectId,
      owner_user_id: ownerUserId,
      order_number: windowUnit.orderNumber,
      pos_number: windowUnit.posNumber,
      type: windowUnit.type,
      overall_width_mm: windowUnit.overallWidth,
      overall_height_mm: windowUnit.overallHeight,
      color: windowUnit.color,
      glazing: windowUnit.glazing ?? {},
      system_pack_id: windowUnit.systemPackId ?? null,
      status: windowUnit.status ?? 'draft',
      quantity: windowUnit.quantity ?? 1,
      position_meta: (windowUnit.positionMeta ?? {}) as Record<string, unknown>,
      meta: { poseId: windowUnit.id, projectCode, saved_at: now },
      optimization: windowUnit.optimization ?? null,
      grid: options?.grid ?? {},
      components: windowUnit.components ?? [],
      hardware: (windowUnit.hardware ?? {}) as Record<string, unknown>,
      selected_preset: options?.selectedPreset ?? null,
      window_unit: {
        ...windowUnit,
        projectCode,
        projectId,
      } as unknown as Record<string, unknown>,
      updated_at: now,
    };

    // Only update if ID is UUID
    if (isUuid(windowUnit.id)) {
        const { data: existingPos } = await supabase
        .from('fabricator_positions_v2')
        .select('id')
        .eq('id', windowUnit.id)
        .eq('owner_user_id', ownerUserId)
        .maybeSingle();

        if (existingPos?.id) {
        const { error: upErr } = await supabase
            .from('fabricator_positions_v2')
            .update(positionPayload)
            .eq('id', windowUnit.id)
            .eq('owner_user_id', ownerUserId);
        if (upErr) throw upErr;
        return { projectId, poseId: windowUnit.id };
        }
    }
    
    // Fallback or Insert logic: If ID is legacy, we might need a new UUID or force insert if we want to migrate?
    // For now, if it's not a UUID, we likely want a new UUID. 
    // However, the interface expects `windowUnit.id` to be the ID.
    // If windowUnit.id is NOT a UUID, we should probably generate a new one for V2
    // But then we lose the link. 
    // Let's assume for now we try to insert. If it fails due to UUID constraint, it throws.
    // But `windowUnit` usually comes from the app state.
    
    // Safer: check if windowUnit.id is UUID. If not, generate one?
    // But wait, the previous code just inserted it.
    // If windowUnit.id is 'project-123', insert will fail if col is uuid.
    
    const insertPayload = { ...positionPayload };
    if (isUuid(windowUnit.id)) {
        (insertPayload as PositionV2Insert).id = windowUnit.id;
    } else {
        // omit ID to let postgres generate it? Or generate one here?
        // If we omit, supabase/postgres generates it. We return the new ID.
        // But we need to return `poseId`.
        // Let's rely on Postgres generation if invalid.
        // BUT `windowUnit.id` is required in the object we return?
        // Actually the return type is { projectId, poseId }.
        
        // If we don't pass ID, we need to capture it from insert response.
    }
    
    // We'll trust that if it's not a valid UUID, we shouldn't force it into the ID column.
    
    const { data: insertedPos, error: insErr } = await supabase
      .from('fabricator_positions_v2')
      .insert(insertPayload as PositionV2Insert)
      .select('id')
      .single();
      
    if (insErr) throw insErr;
    return { projectId, poseId: insertedPos.id };
  },

  async deletePose(poseId: string, ownerUserId: string): Promise<void> {
    if (!isUuid(poseId)) return; // Can't delete non-existent UUID

    const { error } = await supabase
      .from('fabricator_positions_v2')
      .delete()
      .eq('id', poseId)
      .eq('owner_user_id', ownerUserId);
    if (error) throw error;
  },

  /** Update project-level metadata (name, customer, site, status, meta). */
  async updateProject(
    projectId: string,
    ownerUserId: string,
    updates: {
      project_name?: string;
      client_name?: string;
      site_name?: string;
      status?: string;
      meta?: Record<string, unknown>;
    },
  ): Promise<FabricatorProjectV2 | null> {
    if (!isUuid(projectId)) return null;

    const { data, error } = await supabase
      .from('fabricator_projects_v2')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('owner_user_id', ownerUserId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data as FabricatorProjectV2 | null;
  },

  async deleteProject(projectId: string, ownerUserId: string): Promise<void> {
    if (!isUuid(projectId)) return;

    const { error } = await supabase
      .from('fabricator_projects_v2')
      .delete()
      .eq('id', projectId)
      .eq('owner_user_id', ownerUserId);
    if (error) throw error;
  },
};
