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

/** Map v2 position row to WindowUnit for UI (exported for use in hooks/components).
 * AICS-001: sizes come from stored millimetre columns, not inferred values.
 * `window_unit` JSON is optional overlay — missing blob must not hide a pose.
 */
export function mapPositionRowToWindowUnit(row: PositionV2Row): WindowUnit | null {
  if (!row?.id) return null;
  const wu = (row.window_unit ?? {}) as Record<string, unknown>;
  const components = (row.components ?? wu.components ?? []) as WindowUnit['components'];
  const hardwareRaw = wu.hardware ?? row.hardware;
  return {
    id: row.id,
    orderNumber: (wu.orderNumber as string) ?? row.order_number ?? '',
    posNumber: (wu.posNumber as string) ?? row.pos_number ?? '',
    type: (wu.type as string) ?? row.type ?? 'window',
    components: Array.isArray(components) ? components : [],
    overallWidth: Number(wu.overallWidth ?? row.overall_width_mm ?? 0) || 0,
    overallHeight: Number(wu.overallHeight ?? row.overall_height_mm ?? 0) || 0,
    color: (wu.color as string) ?? row.color ?? '',
    glazing: (wu.glazing as WindowUnit['glazing']) ?? row.glazing ?? {},
    hardware: (Array.isArray(hardwareRaw) ? hardwareRaw : []) as WindowUnit['hardware'],
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

export function persistenceErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message && err.message !== '[object Object]') {
    return err.message;
  }
  if (err && typeof err === 'object') {
    const rec = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [rec.message, rec.details, rec.hint, rec.code]
      .filter((v) => typeof v === 'string' && v.length > 0) as string[];
    if (parts.length) return parts.join(' — ');
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

// Helper to validate UUID format
export const isFabricatorUuid = (id: string | undefined | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

const isUuid = isFabricatorUuid;

/** Dual-write trigger mirrors v2 positions onto v1 using the same project UUID. */
async function ensureLegacyProjectMirror(project: {
  id: string;
  owner_user_id: string;
  project_code: string;
  project_name: string;
  client_name: string;
  site_name: string | null;
  system_pack_id: string;
  status?: string;
}): Promise<void> {
  const { data: byId } = await supabase
    .from('fabricator_projects')
    .select('id')
    .eq('id', project.id)
    .maybeSingle();
  if (byId?.id) return;

  const payload = {
    id: project.id,
    owner_user_id: project.owner_user_id,
    project_code: project.project_code,
    project_name: project.project_name,
    client_name: project.client_name,
    site_name: project.site_name,
    currency: 'EGP',
    region: 'egypt',
    system_pack_id: project.system_pack_id,
    status: project.status ?? 'draft',
    meta: {},
  };

  const { error } = await supabase.from('fabricator_projects').insert(payload);
  if (!error) return;
  const isDup = error.code === '23505' || /duplicate|unique/i.test(error.message ?? '');
  if (!isDup) throw new Error(persistenceErrorMessage(error));

  const { error: retryErr } = await supabase.from('fabricator_projects').insert({
    ...payload,
    project_code: `${project.project_code}-V2`,
  });
  if (retryErr && retryErr.code !== '23505') {
    throw new Error(persistenceErrorMessage(retryErr));
  }
}

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
    const resolved = await this.resolveProjectId(projectId, ownerUserId);
    if (!resolved) return null;

    const { data, error } = await supabase
      .from('fabricator_projects_v2')
      .select('*')
      .eq('id', resolved)
      .eq('owner_user_id', ownerUserId)
      .maybeSingle();
    if (error) throw error;
    return data as FabricatorProjectV2 | null;
  },

  /**
   * Resolve a route/legacy id or project code to the canonical v2 project UUID.
   * AICS-001: lookup is exact (id or project_code), never inferred.
   */
  async resolveProjectId(
    rawId: string | undefined | null,
    ownerUserId: string,
    fallbackCode?: string | null,
  ): Promise<string | null> {
    if (rawId && isUuid(rawId)) {
      const { data } = await supabase
        .from('fabricator_projects_v2')
        .select('id')
        .eq('id', rawId)
        .eq('owner_user_id', ownerUserId)
        .maybeSingle();
      if (data?.id) return data.id;
    }

    const codes = [rawId, fallbackCode].filter((c): c is string => !!c && !isUuid(c));
    for (const code of codes) {
      const { data } = await supabase
        .from('fabricator_projects_v2')
        .select('id')
        .eq('project_code', code)
        .eq('owner_user_id', ownerUserId)
        .maybeSingle();
      if (data?.id) return data.id;
    }

    return null;
  },

  async listPositions(ownerUserId: string, projectId?: string | null): Promise<PositionV2Row[]> {
    let q = supabase
      .from('fabricator_positions_v2')
      .select('*')
      .eq('owner_user_id', ownerUserId)
      .order('pos_number', { ascending: true });

    if (projectId) {
      const resolved = await this.resolveProjectId(projectId, ownerUserId, projectId);
      if (!resolved) return [];
      q = q.eq('project_id', resolved);
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
    const siteName =
      (windowUnit.positionMeta as Record<string, unknown> | undefined)?.siteName as string
      ?? (windowUnit.positionMeta as Record<string, unknown> | undefined)?.elevation as string
      ?? null;
    const projectName =
      (windowUnit.positionMeta as Record<string, unknown> | undefined)?.projectName as string
      ?? projectCode;
    const baseProject: Omit<ProjectV2Insert, 'id'> = {
      owner_user_id: ownerUserId,
      project_code: projectCode,
      project_name: projectName,
      client_name: windowUnit.customer ?? 'Fabricator Client',
      site_name: siteName,
      currency: 'EGP',
      region: 'egypt',
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
    } else if (isUuid(windowUnit.projectId)) {
      const { data: inserted, error: projErr } = await supabase
        .from('fabricator_projects_v2')
        .insert({ ...baseProject, id: windowUnit.projectId } as ProjectV2Insert)
        .select('id')
        .single();
      if (projErr || !inserted?.id) throw new Error(persistenceErrorMessage(projErr) || 'Failed to create project');
      projectId = inserted.id;
    } else {
      const { data: v1ByCode } = await supabase
        .from('fabricator_projects')
        .select('id')
        .eq('project_code', projectCode)
        .eq('owner_user_id', ownerUserId)
        .maybeSingle();

      const insertRow: ProjectV2Insert = {
        ...baseProject,
        ...(v1ByCode?.id ? { id: v1ByCode.id } : {}),
      } as ProjectV2Insert;

      const { data: inserted, error: projErr } = await supabase
        .from('fabricator_projects_v2')
        .insert(insertRow)
        .select('id')
        .single();
      if (projErr || !inserted?.id) throw new Error(persistenceErrorMessage(projErr) || 'Failed to create project');
      projectId = inserted.id;
    }

    await ensureLegacyProjectMirror({
      id: projectId,
      owner_user_id: ownerUserId,
      project_code: projectCode,
      project_name: projectName,
      client_name: baseProject.client_name,
      site_name: siteName,
      system_pack_id: baseProject.system_pack_id,
      status: baseProject.status,
    });

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
        createdAt: windowUnit.createdAt instanceof Date ? windowUnit.createdAt.toISOString() : windowUnit.createdAt,
        updatedAt: now,
        projectCode,
        projectId,
      } as unknown as Record<string, unknown>,
      updated_at: now,
    };

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
        if (upErr) throw new Error(persistenceErrorMessage(upErr));
        return { projectId, poseId: windowUnit.id };
        }
    }

    const { data: existingByPos } = await supabase
      .from('fabricator_positions_v2')
      .select('id')
      .eq('project_id', projectId)
      .eq('owner_user_id', ownerUserId)
      .eq('pos_number', windowUnit.posNumber)
      .maybeSingle();

    if (existingByPos?.id) {
      const { error: upErr } = await supabase
        .from('fabricator_positions_v2')
        .update(positionPayload)
        .eq('id', existingByPos.id)
        .eq('owner_user_id', ownerUserId);
      if (upErr) throw new Error(persistenceErrorMessage(upErr));
      return { projectId, poseId: existingByPos.id };
    }

    const insertPayload = { ...positionPayload };
    if (isUuid(windowUnit.id)) {
        (insertPayload as PositionV2Insert).id = windowUnit.id;
    }

    const { data: insertedPos, error: insErr } = await supabase
      .from('fabricator_positions_v2')
      .insert(insertPayload as PositionV2Insert)
      .select('id')
      .single();

    if (insErr || !insertedPos?.id) throw new Error(persistenceErrorMessage(insErr) || 'Failed to save pose');
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
