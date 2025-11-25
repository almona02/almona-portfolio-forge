import { create } from 'zustand';
import type { WindowUnit } from '@/types/fabricator';

interface JobsState {
  jobs: WindowUnit[];
  selectedJobId: string | null;
  isLoading: boolean;
  setJobs: (jobs: WindowUnit[]) => void;
  setSelectedJob: (jobId: string | null) => void;
  updateJobStatus: (jobId: string, status: WindowUnit['status']) => void;
  addOrUpdateJob: (job: WindowUnit) => void;
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
    if (existingIndex === -1) {
      set({ jobs: [...jobs, job] });
    } else {
      const updated = [...jobs];
      updated[existingIndex] = job;
      set({ jobs: updated });
    }
  },

  loadJobs: async () => {
    // Placeholder for future Supabase-backed job loading.
    // For now, this simply toggles loading state so the dashboard
    // can show a consistent UX, while jobs are populated from
    // within FabricatorWorkflow.
    if (get().isLoading) return;

    set({ isLoading: true });
    try {
      // TODO: Replace with actual Supabase or API call.
      // Leaving existing jobs intact.
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));


