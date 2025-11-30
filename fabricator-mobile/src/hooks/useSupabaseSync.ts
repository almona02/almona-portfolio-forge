/**
 * Hook for real-time Supabase synchronization
 */
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export const useRealTimeJobUpdates = (jobId: string | null) => {
  const [updates, setUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (!jobId) return;

    const channel: RealtimeChannel = supabase
      .channel(`job-updates-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cutting_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          console.log('Job update received:', payload);
          setUpdates(prev => [...prev, payload]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  return updates;
};

export const useRealTimeRemnantUpdates = () => {
  const [updates, setUpdates] = useState<any[]>([]);

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel('remnant-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fabricator_remnants',
        },
        (payload) => {
          console.log('Remnant update received:', payload);
          setUpdates(prev => [...prev, payload]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return updates;
};

