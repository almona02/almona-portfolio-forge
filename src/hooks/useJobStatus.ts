import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface JobStatusData {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown';
  message?: string;
  result?: any;
  error?: string;
  estimated_time_seconds?: number;
  completed_at?: string;
  processing_time_seconds?: number;
  created_at?: string;
  started_at?: string;
}

/**
 * React hook for subscribing to job status changes via Supabase Realtime
 */
export function useJobStatus(jobId: string | null) {
  const [jobStatus, setJobStatus] = useState<JobStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJobStatus(null);
      setError(null);
      return;
    }

    let isMounted = true;

    // Subscribe to job status changes via Supabase Realtime
    const subscription = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          if (!isMounted) return;

          const newStatus = payload.new;
          setJobStatus({
            job_id: newStatus.job_id,
            status: newStatus.status,
            message: getStatusMessage(newStatus.status),
            result: newStatus.result_data,
            error: newStatus.error_message,
            estimated_time_seconds: newStatus.estimated_time_seconds,
            completed_at: newStatus.completed_at,
            processing_time_seconds: newStatus.processing_time_seconds,
            created_at: newStatus.created_at,
            started_at: newStatus.started_at,
          });
        }
      )
      .subscribe();

    // Initial status fetch
    const fetchInitialStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to fetch from API first (for immediate status)
        const response = await fetch(`/api/v2/heavy/job/${jobId}`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setJobStatus(data);
          }
        } else if (response.status === 404) {
          // Job not found - might still be being created
          if (isMounted) {
            setJobStatus({
              job_id: jobId,
              status: 'pending',
              message: 'Job is being initialized...',
              estimated_time_seconds: 30,
            });
          }
        } else {
          throw new Error(`Failed to fetch job status: ${response.status}`);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch job status');
          // Set a default pending status
          setJobStatus({
            job_id: jobId,
            status: 'pending',
            message: 'Job status unavailable - monitoring for updates...',
            estimated_time_seconds: 30,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchInitialStatus();

    // Cleanup subscription on unmount
    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [jobId]);

  return {
    jobStatus,
    isLoading,
    error,
    isCompleted: jobStatus?.status === 'completed',
    isFailed: jobStatus?.status === 'failed',
    isProcessing: jobStatus?.status === 'processing',
    isPending: jobStatus?.status === 'pending',
  };
}

/**
 * Helper function to get user-friendly status messages
 */
function getStatusMessage(status: string): string {
  switch (status) {
    case 'pending':
      return 'Job is queued and waiting to be processed';
    case 'processing':
      return 'Optimization is currently running';
    case 'completed':
      return 'Optimization completed successfully';
    case 'failed':
      return 'Optimization job failed';
    default:
      return `Job is in ${status} state`;
  }
}

/**
 * Hook for managing job queue and multiple concurrent jobs
 */
export function useJobQueue() {
  const [activeJobs, setActiveJobs] = useState<Map<string, JobStatusData>>(new Map());

  const addJob = (jobId: string, initialStatus: JobStatusData) => {
    setActiveJobs(prev => new Map(prev.set(jobId, initialStatus)));
  };

  const removeJob = (jobId: string) => {
    setActiveJobs(prev => {
      const newMap = new Map(prev);
      newMap.delete(jobId);
      return newMap;
    });
  };

  const updateJob = (jobId: string, status: JobStatusData) => {
    setActiveJobs(prev => new Map(prev.set(jobId, status)));
  };

  const clearCompletedJobs = () => {
    setActiveJobs(prev => {
      const newMap = new Map();
      for (const [jobId, job] of prev) {
        if (job.status !== 'completed' && job.status !== 'failed') {
          newMap.set(jobId, job);
        }
      }
      return newMap;
    });
  };

  return {
    activeJobs,
    addJob,
    removeJob,
    updateJob,
    clearCompletedJobs,
    activeJobCount: activeJobs.size,
    completedJobs: Array.from(activeJobs.values()).filter(job => job.status === 'completed'),
    failedJobs: Array.from(activeJobs.values()).filter(job => job.status === 'failed'),
  };
}
