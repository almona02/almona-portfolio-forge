import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { WindowUnit } from '@/types/fabricator';
import type { Database } from '@/types/database';

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

        const { data: upsertedProjects, error: projError } = await supabase
          .from('fabricator_projects')
          .upsert(baseProject, { onConflict: 'project_code' })
          .select('*')
          .eq('project_code', projectCode);

        if (projError || !upsertedProjects || upsertedProjects.length === 0) {
          // eslint-disable-next-line no-console
          console.warn('Failed to upsert fabricator project for job sync:', projError);
          return;
        }

        const project = upsertedProjects[0];

        const positionPayload: FabricatorPositionInsert = {
          id: job.id,
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

        const { error: posError } = await supabase
          .from('fabricator_positions')
          .upsert(positionPayload, { onConflict: 'id' });

        if (posError) {
          // eslint-disable-next-line no-console
          console.warn('Failed to upsert fabricator position for job sync:', posError);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error syncing job to Supabase:', err);
      }
    })();
  },

  deleteJob: (jobId) => {
    const { jobs } = get();
    const filtered = jobs.filter((job) => job.id !== jobId);
    set({ jobs: filtered });
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
      type FabricatorPositionRow = Database['public']['Tables']['fabricator_positions']['Row'];

      const [{ data: projects, error: projError }, { data: positions, error: posError }] =
        await Promise.all([
          supabase
            .from('fabricator_projects')
            .select('*')
            .eq('owner_user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('fabricator_positions')
            .select('*')
            .eq('owner_user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

      if (projError) {
        // eslint-disable-next-line no-console
        console.error('Failed to load fabricator projects:', projError);
      }
      if (posError) {
        // eslint-disable-next-line no-console
        console.error('Failed to load fabricator positions:', posError);
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
          components: [],
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
        };
      });

      set({ jobs, isLoading: false });
    } catch (error) {
      console.error('Failed to load jobs:', error);
      set({ isLoading: false });
    }
  },
}));


