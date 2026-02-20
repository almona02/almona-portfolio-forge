/**
 * Project Persistence Service
 * 
 * Systematically saves and loads drawing poses/projects with full state synchronization.
 * Inspired by ABT HeroFis Turkish app - multi-page navigation with state sync.
 * 
 * Constitutional Tier: Tier 3 (Protected Determinism)
 */

import { savePose as constitutionalSavePose } from '@/lib/fabricator/ConstitutionalPersistenceService';
import { MigrationModeService } from '@/lib/fabricator/migration/MigrationModeService';
import { supabase } from '@/lib/supabase';
import { WindowUnit } from '@/types/fabricator';

/** Supabase row shape for fabricator_projects / fabricator_positions (tables not in generated types) */
interface DbProjectRow {
  id: string;
}

/** Position row from fabricator_positions / fabricator_positions_v2 */
interface DbPositionRow {
  id?: string;
  meta?: { poseId?: string; projectCode?: string; project_code?: string };
  project_id?: string;
  project_code?: string;
  pos_number?: string;
  order_number?: string;
  overall_width?: number;
  overall_width_mm?: number;
  overall_height?: number;
  overall_height_mm?: number;
  color?: string;
  glazing?: unknown;
  hardware?: unknown;
  components?: unknown;
  grid?: unknown;
  system_pack_id?: string;
  window_type?: string;
  type?: string;
  status?: string;
  quantity?: number;
  position_meta?: unknown;
  customer?: string;
  updated_at?: string;
  created_at?: string;
  owner_user_id?: string;
  selected_preset?: string;
  window_unit?: Record<string, unknown>;
  optimization?: unknown;
}

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  projectCode: string;
  poseId?: string;
  poseNumber?: string;
  windowUnit: WindowUnit;
  grid: import('@/types/fabricator').WindowGrid | Record<string, unknown>;
  systemPackId: string | null;
  selectedPreset: string | null;
  timestamp: Date;
  userId: string;
  metadata?: {
    designMode?: 'smartdraw' | 'drafting';
    collapsedStates?: {
      systemConfig?: boolean;
      structure?: boolean;
      bom?: boolean;
    };
    [key: string]: unknown;
  };
}

export interface ProjectNavigationState {
  currentPage: 'design' | 'optimization' | 'production' | 'quality' | 'reports' | 'projects' | 'inventory';
  returnPath?: string;
  lastSaved?: Date;
  autoSaveEnabled: boolean;
}

export class ProjectPersistenceService {
  private static readonly STORAGE_KEY = 'almona-project-persistence';
  private static readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds
  private autoSaveTimer: NodeJS.Timeout | null = null;

  /**
   * Save project pose with full state
   */
  async saveProjectPose(
    project: WindowUnit,
    grid: import('@/types/fabricator').WindowGrid | Record<string, unknown>,
    systemPackId: string | null,
    selectedPreset: string | null,
    metadata?: ProjectSnapshot['metadata']
  ): Promise<ProjectSnapshot> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const projectCode = project.orderNumber || project.projectCode || project.id || `project-${Date.now()}`;
      // Standardize poseId to UUID.
      // If the WindowUnit already carries a UUID-shaped id, reuse it (idempotent saves).
      // Otherwise, generate a new UUID. This replaces the legacy composite-string format
      // (e.g. "ORD-123-pose-1") which was fragile and non-portable.
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const poseId = UUID_RE.test(project.id) ? project.id : crypto.randomUUID();

      const snapshot: Omit<ProjectSnapshot, 'id' | 'timestamp' | 'userId'> = {
        projectId: project.id || projectCode,
        projectCode,
        poseId,
        poseNumber: project.positionMeta?.posNumber,
        windowUnit: project,
        grid,
        systemPackId,
        selectedPreset,
        metadata: {
          ...metadata,
          designMode: metadata?.designMode || 'drafting',
        },
      };

      // Migration-mode aware persistence:
      // - v1_legacy: write v1 only (current behavior)
      // - dual_write / v2_canonical: write v2 (v2->v1 mirroring handled by DB triggers)
      let mode:
        | {
            allowsWritesToV1: boolean;
            allowsWritesToV2: boolean;
            readSource: 'v1' | 'v2' | 'both';
          }
        | null = null;
      try {
        mode = await MigrationModeService.getInstance().getCurrentMode();
      } catch (e) {
        console.warn('[ProjectPersistenceService] Failed to derive migration mode; defaulting to v1:', e);
      }

      const shouldWriteV2 = mode?.allowsWritesToV2 === true;
      const shouldWriteV1 = mode?.allowsWritesToV1 !== false; // default true when mode missing

      if (shouldWriteV2) {
        try {
          const result = await constitutionalSavePose(
            project,
            { verifiedBy: user.id, timestamp: new Date().toISOString(), ...metadata },
            { grid, selectedPreset, localBackup: false, emitRealityOS: true }
          );
          const v2Snapshot: ProjectSnapshot = {
            id: result.poseId,
            projectId: result.projectId,
            projectCode,
            poseId,
            poseNumber: project.positionMeta?.posNumber,
            windowUnit: project,
            grid: grid ?? {},
            systemPackId,
            selectedPreset,
            timestamp: new Date(),
            userId: user.id,
            metadata: { ...metadata, designMode: metadata?.designMode || 'drafting' },
          };
          this.saveToLocalStorage(v2Snapshot);
          return v2Snapshot;
        } catch (e) {
          console.warn('[ProjectPersistenceService] v2 save failed; falling back to v1 if allowed:', e);
          if (!shouldWriteV1) {
            throw e;
          }
        }
      }

      // CRITICAL: Find or create project in fabricator_projects table to get project_id UUID
      // The fabricator_positions table requires project_id (UUID NOT NULL), not just project_code
      type FabricatorProjectInsert = {
        owner_user_id: string;
        project_code: string;
        project_name: string;
        client_name: string;
        site_name?: string | null;
        currency?: string;
        region?: string;
        system_pack_id: string;
        status?: string;
        meta?: Record<string, unknown> | null;
      };

      const baseProject: FabricatorProjectInsert = {
        owner_user_id: user.id,
        project_code: projectCode,
        project_name: projectCode,
        client_name: project.positionMeta?.customer || project.customer || 'Fabricator Client',
        site_name: project.positionMeta?.elevation || null,
        currency: 'EGP',
        region: 'global',
        system_pack_id: systemPackId || 'rock60',
        status: project.status || 'draft',
        meta: {},
      };

      // Check if project exists first
      const { data: existingProject } = await supabase
        .from('fabricator_projects')
        .select('id')
        .eq('project_code', projectCode)
        .eq('owner_user_id', user.id)
        .maybeSingle();

      const existingRow = existingProject as DbProjectRow | null;
      let projectId: string;
      if (existingRow?.id) {
        projectId = existingRow.id;
      } else {
        // Insert new project
        const { data: newProject, error: projError } = await supabase
          .from('fabricator_projects')
          .insert(baseProject)
          .select('id')
          .single();

        if (projError || !newProject) {
          console.error('Error creating project:', projError);
          throw new Error(`Failed to create project: ${projError?.message ?? 'Unknown error'}`);
        }

        const newRow = newProject as DbProjectRow;
        projectId = newRow.id;
      }

      // Validate projectId is a valid UUID
      if (!projectId || typeof projectId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
        throw new Error(`Invalid project ID: ${projectId}`);
      }

      // Save to Supabase
      // Note: id is UUID and auto-generated by DB, so we don't provide it
      // Query first to check if record exists (by project_code + pos_number)
      const existingQuery = project.positionMeta?.posNumber
        ? supabase
            .from('fabricator_positions')
            .select('id')
            .eq('project_code', projectCode)
            .eq('pos_number', project.positionMeta.posNumber)
            .eq('owner_user_id', user.id)
            .maybeSingle()
        : Promise.resolve<{ data: DbProjectRow | null; error: null }>({ data: null, error: null });

      const { data: existing } = await existingQuery;
      const existingPos: DbProjectRow | null = existing;

      // Build position data matching database schema
      const positionData: Record<string, unknown> = {
        project_id: projectId, // CRITICAL: Include project_id UUID (required by database constraint)
        owner_user_id: user.id,
        order_number: project.orderNumber,
        project_code: projectCode, // Denormalized column for easier querying
        customer: project.positionMeta?.customer || project.customer,
        pos_number: project.positionMeta?.posNumber,
        type: project.type, // Canonical column (required)
        window_type: project.type, // Alias column (synced via trigger in migration 059)
        overall_width_mm: project.overallWidth, // Canonical column (required by Insert type)
        overall_width: project.overallWidth, // Alias column (synced via trigger)
        overall_height_mm: project.overallHeight, // Canonical column (required by Insert type)
        overall_height: project.overallHeight, // Alias column (synced via trigger)
        color: project.color,
        glazing: project.glazing || {},
        hardware: project.hardware || [],
        components: project.components || [],
        grid: grid || {},
        system_pack_id: systemPackId,
        selected_preset: selectedPreset,
        status: project.status || 'draft',
        quantity: project.quantity || 1,
        position_meta: project.positionMeta || {}, // Canonical metadata column
        meta: { // Additional metadata column (separate from position_meta)
          ...metadata,
          saved_at: new Date().toISOString(),
          poseId, // Store poseId in meta for lookup
        },
        updated_at: new Date().toISOString(),
      };

      let dbError: unknown = null;

      if (existingPos?.id) {
        // Update existing record
        const { error } = await supabase
          .from('fabricator_positions')
          .update(positionData)
          .eq('id', existingPos.id)
          .select()
          .single();
        dbError = error;
      } else {
        // Insert new record (let DB generate UUID)
        const { error } = await supabase
          .from('fabricator_positions')
          .insert(positionData)
          .select()
          .single();
        dbError = error;
      }

      if (dbError) {
        console.error('Error saving project pose:', dbError);
        throw dbError instanceof Error ? dbError : new Error(JSON.stringify(dbError));
      }

      // Also save to localStorage for offline access
      const fullSnapshot: ProjectSnapshot = {
        id: poseId,
        ...snapshot,
        timestamp: new Date(),
        userId: user.id,
      };

      this.saveToLocalStorage(fullSnapshot);

      return fullSnapshot;
    } catch (error) {
      console.error('ProjectPersistenceService.saveProjectPose error:', error);
      throw error;
    }
  }

  /**
   * Load project pose by ID
   */
  async loadProjectPose(poseId: string): Promise<ProjectSnapshot | null> {
    try {
      // Try localStorage first (faster)
      const local = this.loadFromLocalStorage(poseId);
      if (local) {
        // Also fetch from Supabase in background to ensure sync
        this.loadFromSupabase(poseId).catch(console.error);
        return local;
      }

      // Fallback to Supabase
      return await this.loadFromSupabase(poseId);
    } catch (error) {
      console.error('ProjectPersistenceService.loadProjectPose error:', error);
      return null;
    }
  }

  /**
   * Load all poses for a project
   */
  async loadProjectPoses(projectCode: string): Promise<ProjectSnapshot[]> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return [];
      }

      // Prefer v2 if mode says v2/both; fallback to v1.
      const mode = await MigrationModeService.getInstance().getCurrentMode().catch(() => null);
      const readSource = mode?.readSource || 'v1';

      if (readSource === 'v2' || readSource === 'both') {
        const v2 = await this.loadProjectPosesFromV2(projectCode, user.id).catch(() => []);
        if (v2.length > 0 || readSource === 'v2') return v2;
      }

      const { data, error } = await supabase
        .from('fabricator_positions')
        .select('*')
        .eq('project_code', projectCode)
        .eq('owner_user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading project poses:', error);
        return [];
      }

      const rows = (data ?? []) as Record<string, unknown>[];
      return rows.map((row) => this.mapDbRowToSnapshot(row));
    } catch (error) {
      console.error('ProjectPersistenceService.loadProjectPoses error:', error);
      return [];
    }
  }

  /**
   * Start auto-save for a project
   */
  startAutoSave(
    project: WindowUnit,
    grid: import('@/types/fabricator').WindowGrid | Record<string, unknown>,
    systemPackId: string | null,
    selectedPreset: string | null,
    metadata?: ProjectSnapshot['metadata'],
    onSave?: (snapshot: ProjectSnapshot) => void
  ): void {
    this.stopAutoSave();

    this.autoSaveTimer = setInterval(() => {
      void (async () => {
        try {
          const snapshot = await this.saveProjectPose(
          project,
          grid,
          systemPackId,
          selectedPreset,
          metadata
        );
          onSave?.(snapshot);
        } catch (error) {
          console.error('Auto-save error:', error);
        }
      })();
    }, ProjectPersistenceService.AUTO_SAVE_INTERVAL);
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Save navigation state for multi-page flow
   */
  saveNavigationState(state: ProjectNavigationState): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        `${ProjectPersistenceService.STORAGE_KEY}-nav`,
        JSON.stringify({
          ...state,
          lastSaved: state.lastSaved?.toISOString(),
        })
      );
    } catch (error) {
      console.error('Error saving navigation state:', error);
    }
  }

  /**
   * Load navigation state
   */
  loadNavigationState(): ProjectNavigationState | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`${ProjectPersistenceService.STORAGE_KEY}-nav`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { lastSaved?: string; returnPath?: string; currentPage?: string; autoSaveEnabled?: boolean };
      return {
        currentPage: (parsed.currentPage as ProjectNavigationState['currentPage']) ?? 'design',
        returnPath: parsed.returnPath,
        lastSaved: parsed.lastSaved ? new Date(parsed.lastSaved) : undefined,
        autoSaveEnabled: parsed.autoSaveEnabled ?? true,
      };
    } catch (error) {
      console.error('Error loading navigation state:', error);
      return null;
    }
  }

  /**
   * Get return path after save (for navigation)
   */
  getReturnPath(): string | null {
    const navState = this.loadNavigationState();
    return navState?.returnPath || null;
  }

  // Private helpers

  private async loadFromSupabase(poseId: string): Promise<ProjectSnapshot | null> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Prefer v2 if mode says v2/both; fallback to v1.
    const mode = await MigrationModeService.getInstance().getCurrentMode().catch(() => null);
    const readSource = mode?.readSource || 'v1';

    if (readSource === 'v2' || readSource === 'both') {
      const v2 = await this.loadFromSupabaseV2(poseId, user.id).catch(() => null);
      if (v2 || readSource === 'v2') return v2;
    }

    // v1 query by poseId stored in meta (since id is UUID, not poseId)
    const { data, error } = await supabase
      .from('fabricator_positions')
      .select('*')
      .eq('meta->>poseId', poseId)
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (error || !data) return null;

    const snapshot = this.mapDbRowToSnapshot(data as Record<string, unknown>);
    this.saveToLocalStorage(snapshot);
    return snapshot;
  }

  /**
   * v2 write path (canonical when migration mode allowsWritesToV2 = true)
   */
  private async saveProjectPoseToV2(args: {
    userId: string;
    project: WindowUnit;
    grid: import('@/types/fabricator').WindowGrid | Record<string, unknown>;
    systemPackId: string | null;
    selectedPreset: string | null;
    projectCode: string;
    poseId: string;
    metadata?: ProjectSnapshot['metadata'];
  }): Promise<ProjectSnapshot> {
    const { userId, project, grid, systemPackId, selectedPreset, projectCode, poseId, metadata } = args;

    type FabricatorProjectV2Insert = {
      owner_user_id: string;
      project_code: string;
      project_name: string;
      client_name: string;
      site_name?: string | null;
      currency?: string;
      region?: string;
      system_pack_id: string;
      status?: string;
      meta?: Record<string, unknown> | null;
    };

    const baseProject: FabricatorProjectV2Insert = {
      owner_user_id: userId,
      project_code: projectCode,
      project_name: projectCode,
      client_name: project.positionMeta?.customer || project.customer || 'Fabricator Client',
      site_name: project.positionMeta?.elevation || null,
      currency: 'EGP',
      region: 'global',
      system_pack_id: systemPackId || 'rock60',
      status: project.status || 'draft',
      meta: {},
    };

    // Find or create v2 project (unique per tenant)
    const { data: existingProject } = await supabase
      .from('fabricator_projects_v2')
      .select('id')
      .eq('project_code', projectCode)
      .eq('owner_user_id', userId)
      .maybeSingle();

    const existingProjRow = existingProject as DbProjectRow | null;
    let projectId: string;
    if (existingProjRow?.id) {
      projectId = existingProjRow.id;
    } else {
      const { data: newProject, error: projError } = await supabase
        .from('fabricator_projects_v2')
        .insert(baseProject)
        .select('id')
        .single();

      if (projError || !newProject) {
        throw new Error(`Failed to create v2 project: ${projError?.message ?? 'Unknown error'}`);
      }
      const newRow = newProject as DbProjectRow;
      projectId = newRow.id;
    }

    // Find existing v2 position via meta.poseId (stable key independent of UUID id)
    const { data: existingPos } = await supabase
      .from('fabricator_positions_v2')
      .select('id')
      .eq('meta->>poseId', poseId)
      .eq('owner_user_id', userId)
      .maybeSingle();

    const existingPosRow = existingPos as DbProjectRow | null;
    const nowIso = new Date().toISOString();
    const positionData: Record<string, unknown> = {
      project_id: projectId,
      owner_user_id: userId,
      order_number: project.orderNumber,
      pos_number: project.positionMeta?.posNumber,
      type: project.type,
      overall_width_mm: project.overallWidth,
      overall_height_mm: project.overallHeight,
      color: project.color,
      glazing: project.glazing || {},
      system_pack_id: systemPackId,
      status: project.status || 'draft',
      quantity: project.quantity || 1,
      position_meta: project.positionMeta || {},
      meta: {
        ...(metadata || {}),
        saved_at: nowIso,
        poseId,
      },
      optimization: project.optimization || null,
      grid: grid || {},
      components: project.components || [],
      hardware: project.hardware || {},
      selected_preset: selectedPreset,
      window_unit: {
        ...project,
        // ensure we retain pose metadata fields that callers rely on
        projectCode,
        projectId,
      },
      updated_at: nowIso,
    };

    if (existingPosRow?.id) {
      const { error } = await supabase
        .from('fabricator_positions_v2')
        .update(positionData)
        .eq('id', existingPosRow.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('fabricator_positions_v2')
        .insert(positionData);
      if (error) throw error;
    }

    const snapshot: ProjectSnapshot = {
      id: poseId,
      projectId: projectId,
      projectCode,
      poseId,
      poseNumber: project.positionMeta?.posNumber,
      windowUnit: project,
      grid,
      systemPackId,
      selectedPreset,
      timestamp: new Date(),
      userId,
      metadata: metadata || {},
    };

    return snapshot;
  }

  private async loadFromSupabaseV2(poseId: string, userId: string): Promise<ProjectSnapshot | null> {
    const { data, error } = await supabase
      .from('fabricator_positions_v2')
      .select('*')
      .eq('meta->>poseId', poseId)
      .eq('owner_user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    const snapshot = this.mapDbRowToSnapshotV2(data as Record<string, unknown>);
    this.saveToLocalStorage(snapshot);
    return snapshot;
  }

  private async loadProjectPosesFromV2(projectCode: string, userId: string): Promise<ProjectSnapshot[]> {
    const { data: proj } = await supabase
      .from('fabricator_projects_v2')
      .select('id')
      .eq('project_code', projectCode)
      .eq('owner_user_id', userId)
      .maybeSingle();

    const projRow = proj as DbProjectRow | null;
    if (!projRow?.id) return [];

    const { data, error } = await supabase
      .from('fabricator_positions_v2')
      .select('*')
      .eq('project_id', projRow.id)
      .eq('owner_user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) return [];
    const rows = (data ?? []) as Record<string, unknown>[];
    return rows.map((row) => this.mapDbRowToSnapshotV2(row));
  }

  private mapDbRowToSnapshotV2(row: Record<string, unknown>): ProjectSnapshot {
    const r = row as DbPositionRow;
    const poseId = r.meta?.poseId ?? r.id;
    const unit = r.window_unit ?? {};
    return {
      id: poseId ?? '',
      projectId: r.project_id ?? '',
      projectCode: (unit as { projectCode?: string }).projectCode ?? (unit as { project_code?: string }).project_code ?? r.meta?.projectCode ?? r.meta?.project_code ?? r.project_id ?? '',
      poseId: poseId ?? '',
      poseNumber: r.pos_number,
      windowUnit: (unit && Object.keys(unit).length > 0
        ? unit
        : {
            id: r.id,
            orderNumber: r.order_number,
            overallWidth: r.overall_width_mm,
            overallHeight: r.overall_height_mm,
            color: r.color,
            glazing: r.glazing,
            hardware: r.hardware,
            components: r.components,
            grid: r.grid,
            systemPackId: r.system_pack_id,
            type: r.type,
            status: r.status,
            quantity: r.quantity,
            positionMeta: r.position_meta ?? {},
            optimization: r.optimization,
          }) as WindowUnit,
      grid: r.grid ?? {},
      systemPackId: r.system_pack_id ?? null,
      selectedPreset: r.selected_preset ?? null,
      timestamp: new Date(r.updated_at ?? r.created_at ?? Date.now()),
      userId: r.owner_user_id ?? '',
      metadata: (r.meta as Record<string, unknown>) ?? {},
    };
  }

  private mapDbRowToSnapshot(row: Record<string, unknown>): ProjectSnapshot {
    const r = row as DbPositionRow;
    const poseId = r.meta?.poseId ?? r.id ?? '';
    return {
      id: poseId,
      projectId: r.project_code ?? '',
      projectCode: r.project_code ?? '',
      poseId,
      poseNumber: r.pos_number,
      windowUnit: {
        id: r.id,
        orderNumber: r.order_number,
        overallWidth: r.overall_width,
        overallHeight: r.overall_height,
        color: r.color,
        glazing: r.glazing,
        hardware: r.hardware,
        components: r.components,
        grid: r.grid,
        systemPackId: r.system_pack_id,
        type: r.window_type,
        status: r.status,
        quantity: r.quantity,
        positionMeta: {
          posNumber: r.pos_number,
          customer: r.customer,
        },
      } as WindowUnit,
      grid: r.grid ?? {},
      systemPackId: r.system_pack_id ?? null,
      selectedPreset: r.selected_preset ?? null,
      timestamp: new Date(r.updated_at ?? r.created_at ?? Date.now()),
      userId: r.owner_user_id ?? '',
      metadata: (r.meta as Record<string, unknown>) ?? {},
    };
  }

  private saveToLocalStorage(snapshot: ProjectSnapshot): void {
    if (typeof window === 'undefined') return;
    try {
      const key = `${ProjectPersistenceService.STORAGE_KEY}-${snapshot.poseId}`;
      localStorage.setItem(key, JSON.stringify({
        ...snapshot,
        timestamp: snapshot.timestamp.toISOString(),
      }));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private loadFromLocalStorage(poseId: string): ProjectSnapshot | null {
    if (typeof window === 'undefined') return null;
    try {
      const key = `${ProjectPersistenceService.STORAGE_KEY}-${poseId}`;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { timestamp?: string | number; [key: string]: unknown };
      const ts = parsed.timestamp;
      return {
        ...parsed,
        timestamp: ts ? new Date(typeof ts === 'number' ? ts : ts) : new Date(),
      } as ProjectSnapshot;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return null;
    }
  }
}

// Singleton instance
export const projectPersistenceService = new ProjectPersistenceService();

