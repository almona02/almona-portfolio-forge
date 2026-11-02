import { memo, useCallback, useMemo } from 'react';
import EnhancedProductCard from '@/shared/ui/ui/EnhancedProductCard';
import type { Machine } from '@/constants/yilmazMachines';

interface MobileOptimizedGridProps {
  machines: (Machine & { has3DModel?: boolean; modelPath?: string })[];
  selectedMachines: Machine[];
  onSelectMachine: (machine: Machine, selected: boolean) => void;
  onQuoteRequest: (machine: Machine) => void;
  on3DView?: (machine: Machine) => void;
  onQuickPreview?: (machine: Machine) => void;
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
  onQuickPreview,
  hasMore,
  onLoadMore,
  isLoading
}) => {
  const copy = usePublicCopy();

  // Scroll to the first newly-loaded machine after "Load More" appends cards.
  // Data-attribute + retrying timeout: no ref callbacks, no rAF/timing guesswork.
  const handleLoadMore = useCallback(() => {
    const firstNewIndex = machines.length;
    onLoadMore();
    const tryScroll = (attempt: number) => {
      const el = document.querySelector(`[data-scroll-target="m-${firstNewIndex}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (attempt < 6) {
        setTimeout(() => tryScroll(attempt + 1), 200);
      }
    };
    setTimeout(() => tryScroll(0), 400);
  }, [onLoadMore, machines.length]);

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

  // Map machines to cards inline — the callback ref needs the index to detect the first new card
  const machineCards = machines.map((machine, index) => {
    const isSelected = selectedMachines.some(m => m.id === machine.id);

    return (
      <div
        key={machine.id}
        data-scroll-target={`m-${index}`}
        className="transform transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] scroll-mt-28"
      >
        <EnhancedProductCard
          machine={machine}
          isSelected={isSelected}
          onSelect={onSelectMachine}
          onQuoteRequest={onQuoteRequest}
          on3DView={on3DView}
          onQuickPreview={onQuickPreview}
          show3DBadge={true}
        />
      </div>
    );
  });

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
            onClick={handleLoadMore}
            disabled={isLoading}
            className={`
              w-full max-w-sm
              px-6 py-3
              bg-gradient-to-r from-amber-500 to-red-500
              hover:from-amber-600 hover:to-red-600
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
                <span>{copy('Loading...')}</span>
              </div>
            ) : (
              copy('Load More Machines')
            )}
          </button>
        </div>
      )}
    </div>
  );
});

MobileOptimizedGrid.displayName = 'MobileOptimizedGrid';
import { usePublicCopy } from '@/hooks/usePublicCopy';
