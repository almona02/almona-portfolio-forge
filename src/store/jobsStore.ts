import { ConnectivityFactory } from '@/lib/connectivity/ConnectivityGateway';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { WindowUnit } from '@/types/fabricator';
import { create } from 'zustand';

interface JobsState {
  jobs: WindowUnit[];
  selectedJobId: string | null;
  isLoading: boolean;
  setJobs: (jobs: WindowUnit[]) => void;
  setSelectedJob: (jobId: string | null) => void;
  updateJobStatus: (jobId: string, status: WindowUnit['status']) => void;
  addOrUpdateJob: (job: WindowUnit) => void;
  deleteJob: (jobId: string) => void;
  loadJobs: () => Promise<void>;
  bulkUpdateJobs: (jobIds: string[], updates: Partial<WindowUnit>) => Promise<void>;
  bulkDeleteJobs: (jobIds: string[]) => Promise<void>;
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  selectedJobId: null,
  isLoading: false,

  setJobs: (jobs) => set({ jobs }),

  setSelectedJob: (jobId) => set({ selectedJobId: jobId }),

  updateJobStatus: (jobId, status) => {
    const { jobs } = get();
    const updatedJobs = jobs.map((job) =>
      job.id === jobId ? { ...job, status, updatedAt: new Date() } : job
    );
    set({ jobs: updatedJobs });
  },

  addOrUpdateJob: (job) => {
    const { jobs } = get();
    const existingIndex = jobs.findIndex((j) => j.id === job.id);
    const nextJobs =
      existingIndex === -1
        ? [...jobs, job]
        : (() => {
            const updated = [...jobs];
            updated[existingIndex] = job;
            return updated;
          })();

    set({ jobs: nextJobs });

    // Fire-and-forget Supabase sync for persistence
    void (async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) return;

        type FabricatorProjectInsert = Database['public']['Tables']['fabricator_projects']['Insert'];
        type FabricatorPositionInsert = Database['public']['Tables']['fabricator_positions']['Insert'];

        const projectCode = job.projectCode || job.orderNumber;
        const baseProject: FabricatorProjectInsert = {
          owner_user_id: user.id,
          project_code: projectCode,
          project_name: job.projectCode || job.orderNumber,
          client_name: job.customer || 'Fabricator Client',
          site_name: job.positionMeta?.elevation || null,
          currency: 'EGP',
          region: 'global',
          system_pack_id: job.systemPackId || 'rock60',
          status: job.status,
          meta: {},
        };

        // Check if project exists first, then update or insert
        const { data: existingProject } = await (supabase
          .from('fabricator_projects') as any)
          .select('id')
          .eq('project_code', projectCode)
          .eq('owner_user_id', user.id)
          .maybeSingle();

        let upsertedProjects = null;
        let projError = null;

        if (existingProject) {
          // Update existing project
          const { data, error } = await (supabase
            .from('fabricator_projects') as any)
            .update(baseProject)
            .eq('id', existingProject.id)
            .select('*')
            .single();
          upsertedProjects = data ? [data] : null;
          projError = error;
        } else {
          // Insert new project
          const { data, error } = await (supabase
            .from('fabricator_projects') as any)
            .insert(baseProject)
            .select('*')
            .single();
          upsertedProjects = data ? [data] : null;
          projError = error;
        }

        if (projError || !upsertedProjects || upsertedProjects.length === 0) {
          const status = (projError as any)?.status || (projError as any)?.code;
          const isExpectedError = status === 403 || status === 404 || 
                                  (projError as any)?.code === 'PGRST116' ||
                                  (projError as any)?.message?.includes('permission') ||
                                  (projError as any)?.message?.includes('RLS');
          if (!isExpectedError && process.env.NODE_ENV === 'development') {
            console.warn('Failed to upsert fabricator project for job sync:', projError);
          }
          return;
        }

        const project = upsertedProjects[0];
        
        if (!project || !project.id || typeof project.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(project.id)) {
          console.warn('Invalid project ID returned from database:', project);
          return;
        }

        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(job.id);
        let existingPosition = null;
        
        if (isValidUUID) {
          const { data } = await supabase
            .from('fabricator_positions')
            .select('id')
            .eq('id', job.id)
            .maybeSingle();
          existingPosition = data;
        }
        
        if (!existingPosition) {
          const { data } = await supabase
            .from('fabricator_positions')
            .select('id')
            .eq('project_id', project.id)
            .eq('order_number', job.orderNumber)
            .eq('pos_number', job.posNumber)
            .maybeSingle();
          existingPosition = data;
        }

        const positionPayload: FabricatorPositionInsert = {
          project_id: project.id,
          owner_user_id: user.id,
          order_number: job.orderNumber,
          pos_number: job.posNumber,
          type: job.type,
          overall_width_mm: job.overallWidth,
          overall_height_mm: job.overallHeight,
          color: job.color,
          glazing: job.glazing as any,
          system_pack_id: job.systemPackId || project.system_pack_id,
          status: job.status,
          quantity: job.quantity ?? 1,
          position_meta: (job.positionMeta as any) || {},
          optimization: (job.optimization as any) || null,
        };

        let posError = null;

        if (existingPosition) {
          const { error } = await (supabase
            .from('fabricator_positions') as any)
            .update(positionPayload)
            .eq('id', existingPosition.id);
          posError = error;
        } else {
          const insertPayload: FabricatorPositionInsert = {
            ...positionPayload,
            ...(isValidUUID ? { id: job.id } : {}),
          };
          const { error } = await (supabase
            .from('fabricator_positions') as any)
            .insert(insertPayload);
          posError = error;
        }

        if (posError) {
          const status = (posError as any)?.status || (posError as any)?.code;
          const isExpectedError = status === 403 || status === 404 || 
                                  (posError as any)?.code === 'PGRST116' ||
                                  (posError as any)?.message?.includes('permission') ||
                                  (posError as any)?.message?.includes('RLS');
          if (!isExpectedError && process.env.NODE_ENV === 'development') {
            console.warn('Failed to upsert fabricator position for job sync:', posError);
          }
        }

        // ------------------------------------------------------------------
        // ERP SYNC (Fire-and-forget)
        // ------------------------------------------------------------------
        try {
            // TODO: Get config from settings store
            const erpConfig = { 
                id: 'default', 
                name: 'Default ERP', 
                type: 'ERP' as const, 
                provider: 'odoo' as const, 
                isEnabled: false // Disabled by default until configured
            }; 
            
            if (erpConfig.isEnabled) {
                const adapter = ConnectivityFactory.getAdapter(erpConfig);
                await adapter.connect();
                await adapter.syncOrder(job);
            }
        } catch (erpErr) {
            console.warn('ERP Sync failed:', erpErr);
        }

      } catch (err) {
        console.error('Error syncing job to Supabase:', err);
      }
    })();
  },

  deleteJob: (jobId) => {
    const { jobs } = get();
    const filtered = jobs.filter((job) => job.id !== jobId);
    set({ jobs: filtered });
    
    // Fire-and-forget Supabase delete
    void (async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if(!user) return;
            await supabase.from('fabricator_positions').delete().eq('id', jobId).eq('owner_user_id', user.id);
        } catch (e) {
            console.error(e);
        }
    })();
  },

  bulkUpdateJobs: async (jobIds, updates) => {
    const { jobs } = get();
    const updatedJobs = jobs.map((job) =>
      jobIds.includes(job.id) ? { ...job, ...updates, updatedAt: new Date() } : job
    );
    set({ jobs: updatedJobs });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dbUpdates: any = {};
      
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.color) dbUpdates.color = updates.color;
      if (updates.systemPackId) dbUpdates.system_pack_id = updates.systemPackId;
      if (updates.glazing) dbUpdates.glazing = updates.glazing;

      if (Object.keys(dbUpdates).length === 0) return;

      const { error } = await supabase
        .from('fabricator_positions')
        .update(dbUpdates)
        .in('id', jobIds)
        .eq('owner_user_id', user.id);

      if (error) {
        console.error('Failed to bulk update jobs in Supabase:', error);
      }
    } catch (err) {
      console.error('Error in bulkUpdateJobs:', err);
    }
  },

  bulkDeleteJobs: async (jobIds) => {
    const { jobs } = get();
    const remainingJobs = jobs.filter((job) => !jobIds.includes(job.id));
    set({ jobs: remainingJobs, selectedJobId: null });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('fabricator_positions')
        .delete()
        .in('id', jobIds)
        .eq('owner_user_id', user.id);

      if (error) {
        console.error('Failed to bulk delete jobs in Supabase:', error);
      }
    } catch (err) {
      console.error('Error in bulkDeleteJobs:', err);
    }
  },

  loadJobs: async () => {
    if (get().isLoading) return;

    set({ isLoading: true });
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        set({ jobs: [], isLoading: false });
        return;
      }

      type FabricatorProjectRow = Database['public']['Tables']['fabricator_projects']['Row'];

      const [{ data: projects, error: projError }, { data: positions, error: posError }] =
        await Promise.all([
          (supabase
            .from('fabricator_projects') as any)
            .select('*')
            .eq('owner_user_id', user.id)
            .order('created_at', { ascending: false }),
          (supabase
            .from('fabricator_positions') as any)
            .select('*')
            .eq('owner_user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

      if (projError) {
        console.error('Failed to load fabricator projects:', projError as any);
      }
      if (posError) {
        console.error('Failed to load fabricator positions:', posError as any);
      }

      const projectById = new Map<string, FabricatorProjectRow>();
      (projects || []).forEach((p) => {
        projectById.set(p.id, p as FabricatorProjectRow);
      });

      const jobs: WindowUnit[] = (positions || []).map((row) => {
        const p = projectById.get(row.project_id as string);
        return {
          id: row.id,
          orderNumber: row.order_number,
          posNumber: row.pos_number,
          type: row.type,
          components: [], // Loaded separately or not stored in fast list
          overallWidth: row.overall_width_mm,
          overallHeight: row.overall_height_mm,
          color: row.color,
          glazing: row.glazing || {},
          hardware: [],
          status: row.status as WindowUnit['status'],
          optimization: (row.optimization as any) || null,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          customer: p?.client_name,
          projectCode: p?.project_code,
          systemPackId: row.system_pack_id || p?.system_pack_id,
          quantity: row.quantity || 1,
          positionMeta: (row.position_meta as any) || undefined,
          grid: (row.grid as any) || undefined, 
        };
      });

      set({ jobs, isLoading: false });
    } catch (error) {
      console.error('Failed to load jobs:', error);
      set({ isLoading: false });
    }
  },
}));

// [DEV/E2E] Expose store for testing
if (import.meta.env.DEV) {
  if (typeof window !== 'undefined') {
    (window as any).jobsStore = useJobsStore;
  }
}
