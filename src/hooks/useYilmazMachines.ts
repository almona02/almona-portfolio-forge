/**
 * Hook to fetch Yilmaz machines data asynchronously
 * Moves 2,621 lines of data out of the initial bundle
 */

import { useQuery } from '@tanstack/react-query';
import type { Machine } from '@/constants/yilmazMachines';

// Cache key for React Query
const MACHINES_QUERY_KEY = ['yilmazMachines'];

/**
 * Fetch machines data from JSON file
 * This moves the data out of the JavaScript bundle
 */
async function fetchMachines(): Promise<Machine[]> {
  // Try to load from public/data first (for production/preview)
  try {
    const response = await fetch('/data/yilmazMachines.json');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      console.warn('JSON file returned empty or invalid data, falling back to dynamic import');
    } else {
      console.warn(`Failed to fetch machines: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.warn('Failed to fetch machines from /data, falling back to dynamic import:', error);
  }

  // Fallback: dynamic import from constants (for development or if JSON doesn't exist)
  try {
    const { yilmazMachines } = await import('@/constants/yilmazMachines');
    if (Array.isArray(yilmazMachines) && yilmazMachines.length > 0) {
      return yilmazMachines;
    }
    console.error('Fallback import returned empty or invalid data');
    return [];
  } catch (error) {
    console.error('Failed to import machines from constants:', error);
    return [];
  }
}

/**
 * Hook to get Yilmaz machines data
 * Uses React Query for caching and automatic refetching
 */
export function useYilmazMachines() {
  return useQuery<Machine[]>({
    queryKey: MACHINES_QUERY_KEY,
    queryFn: fetchMachines,
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 7, // Keep in cache for 7 days
    retry: 2, // Retry failed requests twice
    retryDelay: 1000, // Wait 1 second between retries
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: true, // Always refetch on mount to ensure data is loaded
  });
}

/**
 * Get a single machine by ID
 */
export function useYilmazMachine(id: string) {
  const { data: machines, ...rest } = useYilmazMachines();
  const machine = machines?.find(m => m.id === id);
  return { machine, ...rest };
}

