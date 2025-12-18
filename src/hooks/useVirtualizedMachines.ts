import { useState, useMemo, useCallback } from 'react';
import { useYilmazMachines } from './useYilmazMachines';
import { intelligentSearch, categorizeMachine } from '@/constants/smartCategories';
import type { Machine } from '@/constants/yilmazMachines';

interface UseVirtualizedMachinesOptions {
  searchTerm?: string;
  categoryFilter?: string;
  sortOption?: string;
  pageSize?: number;
}

interface VirtualizedResult {
  machines: Machine[];
  totalCount: number;
  hasMore: boolean;
  loadMore: () => void;
  isLoading: boolean;
}

export function useVirtualizedMachines({
  searchTerm = '',
  categoryFilter = 'all',
  sortOption = 'featured',
  pageSize = 12
}: UseVirtualizedMachinesOptions = {}): VirtualizedResult {
  const [currentPage, setCurrentPage] = useState(1);
  const { data: yilmazMachines = [], isLoading: isDataLoading } = useYilmazMachines();
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingData = isDataLoading || isLoading;

  // Memoize filtered and sorted machines to prevent unnecessary recalculations
  const filteredAndSortedMachines = useMemo(() => {
    let filtered = yilmazMachines;

    // Apply AI-powered search if search term exists
    if (searchTerm.trim()) {
      filtered = intelligentSearch(searchTerm, filtered);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((machine) => {
        // Check both legacy category and smart category
        const legacyMatch = machine.category === categoryFilter;
        const smartCategory = categorizeMachine(machine);
        const smartMatch = smartCategory === categoryFilter;
        
        return legacyMatch || smartMatch;
      });
    }

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'newest':
          return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        case 'featured':
        default:
          return a.featured ? -1 : b.featured ? 1 : 0;
      }
    });
  }, [searchTerm, categoryFilter, sortOption]);

  // Get current page of machines
  const machines = useMemo(() => {
    const startIndex = 0;
    const endIndex = currentPage * pageSize;
    return filteredAndSortedMachines.slice(startIndex, endIndex);
  }, [filteredAndSortedMachines, currentPage, pageSize]);

  const totalCount = filteredAndSortedMachines.length;
  const hasMore = machines.length < totalCount;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setIsLoading(true);
      // Simulate loading delay for better UX
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setIsLoading(false);
      }, 300);
    }
  }, [hasMore, isLoading]);

  return {
    machines,
    totalCount,
    hasMore,
    loadMore,
    isLoading: isLoadingData
  };
}
