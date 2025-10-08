import React, { memo, useMemo } from 'react';
import { OptimizedProductCard } from './OptimizedProductCard';
import type { Machine } from '@/constants/yilmazMachines';

interface MobileOptimizedGridProps {
  machines: Machine[];
  selectedMachines: Machine[];
  onSelectMachine: (machine: Machine, selected: boolean) => void;
  onQuoteRequest: (machine: Machine) => void;
  on3DView?: (machine: Machine) => void;
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading: boolean;
}

export const MobileOptimizedGrid = memo<MobileOptimizedGridProps>(({
  machines,
  selectedMachines,
  onSelectMachine,
  onQuoteRequest,
  on3DView,
  hasMore,
  onLoadMore,
  isLoading
}) => {
  // Optimize grid layout for mobile devices with better aspect ratio support
  const gridClasses = useMemo(() => {
    return `
      grid gap-4
      grid-cols-1
      sm:grid-cols-2
      lg:grid-cols-2
      xl:grid-cols-2
      2xl:grid-cols-3
    `.trim().replace(/\s+/g, ' ');
  }, []);

  // Memoize machine cards to prevent unnecessary re-renders
  const machineCards = useMemo(() => {
    return machines.map((machine) => {
      const isSelected = selectedMachines.some(m => m.id === machine.id);
      
      return (
        <div
          key={machine.id}
          className="transform transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <OptimizedProductCard
            machine={machine}
            isSelected={isSelected}
            onSelect={(selected) => onSelectMachine(machine, selected)}
            onQuoteRequest={() => onQuoteRequest(machine)}
            on3DView={on3DView ? () => on3DView(machine) : undefined}
          />
        </div>
      );
    });
  }, [machines, selectedMachines, onSelectMachine, onQuoteRequest, on3DView]);

  return (
    <div className="w-full">
      {/* Mobile-optimized grid */}
      <div className={gridClasses}>
        {machineCards}
      </div>
      
      {/* Load more button - optimized for mobile */}
      {hasMore && (
        <div className="flex justify-center mt-8 px-4">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className={`
              w-full max-w-sm
              px-6 py-3
              bg-gradient-to-r from-orange-500 to-red-500
              hover:from-orange-600 hover:to-red-600
              disabled:from-gray-500 disabled:to-gray-600
              text-white font-medium
              rounded-lg
              transition-all duration-200
              active:scale-95
              touch-manipulation
              ${isLoading ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              'Load More Machines'
            )}
          </button>
        </div>
      )}
    </div>
  );
});

MobileOptimizedGrid.displayName = 'MobileOptimizedGrid';
