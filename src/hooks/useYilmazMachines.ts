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
  // Try to load from public/data first (for production)
  try {
    const response = await fetch('/data/yilmazMachines.json');
    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.warn('Failed to fetch machines from /data, falling back to dynamic import:', error);
  }

  // Fallback: dynamic import from constants (for development or if JSON doesn't exist)
  const { yilmazMachines } = await import('@/constants/yilmazMachines');
  return yilmazMachines;
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

