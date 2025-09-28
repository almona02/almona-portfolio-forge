import { useState, useMemo, useCallback } from 'react';
import { yilmazMachines } from '@/constants/yilmazMachines';
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
  const [isLoading, setIsLoading] = useState(false);

  // Memoize filtered and sorted machines to prevent unnecessary recalculations
  const filteredAndSortedMachines = useMemo(() => {
    const filtered = yilmazMachines.filter((machine) => {
      const matchesSearch = 
        machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = 
        categoryFilter === 'all' || machine.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

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
    isLoading
  };
}
