import { useState, useMemo, useCallback, useEffect } from 'react';
import { useYilmazMachines } from './useYilmazMachines';
import { categorizeMachine } from '@/constants/smartCategories';
import { searchPublicMachines } from '@/lib/publicMachineSearch';
import { usePublicCopy } from './usePublicCopy';
import type { Machine } from '@/constants/yilmazMachines';

interface UseVirtualizedMachinesOptions {
  searchTerm?: string;
  categoryFilter?: string;
  materialFilter?: string;
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
  materialFilter = 'all',
  sortOption = 'featured',
  pageSize = 12
}: UseVirtualizedMachinesOptions = {}): VirtualizedResult {
  const copy = usePublicCopy();
  const [currentPage, setCurrentPage] = useState(1);
  const { data: yilmazMachines = [], isLoading: isDataLoading } = useYilmazMachines();
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingData = isDataLoading || isLoading;

  // Reset pagination whenever the active filter changes (tab/category/search/sort)
  // so switching Aluminium <-> PVC (or changing any filter) starts back at page 1.
  useEffect(() => {
    setCurrentPage(1);
  }, [materialFilter, categoryFilter, searchTerm, sortOption]);

  // Memoize filtered and sorted machines to prevent unnecessary recalculations
  const filteredAndSortedMachines = useMemo(() => {
    let filtered = yilmazMachines;

    // Apply software-assisted search if search term exists
    if (searchTerm.trim()) {
      filtered = searchPublicMachines(searchTerm, filtered, copy);
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

    // Apply material filter (aluminium / pvc). 'both' machines appear in both tabs.
    // When searching, span BOTH materials so a customer can find any machine number
    // regardless of the active tab.
    if (materialFilter !== 'all' && !searchTerm.trim()) {
      filtered = filtered.filter((machine) =>
        machine.material === materialFilter || machine.material === 'both'
      );
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
  }, [yilmazMachines, searchTerm, categoryFilter, materialFilter, sortOption, copy]);

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
