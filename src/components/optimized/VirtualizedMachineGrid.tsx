import { usePublicCopy } from '@/hooks/usePublicCopy';
/**
 * Machine Grid Component
 * Simple grid layout for machine cards with proper spacing and alignment
 */

import React, { memo, useCallback } from 'react';
import EnhancedProductCard from '@/shared/ui/ui/EnhancedProductCard';
import { Button } from '@/shared/ui/ui/button';
import { Loader2 } from 'lucide-react';
import type { Machine } from '@/constants/yilmazMachines';

interface VirtualizedMachineGridProps {
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

export const VirtualizedMachineGrid = memo<VirtualizedMachineGridProps>(({
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
      const el = document.querySelector(`[data-scroll-target="d-${firstNewIndex}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (attempt < 6) {
        setTimeout(() => tryScroll(attempt + 1), 200);
      }
    };
    // the hook's loadMore has a ~300ms delay before the new cards render
    setTimeout(() => tryScroll(0), 400);
  }, [onLoadMore, machines.length]);

  return (
    <div className="w-full">
      {/* Simple CSS Grid - cards auto-size to content with equal heights per row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
        {machines.map((machine, index) => {
          const isSelected = selectedMachines.some(m => m.id === machine.id);
          return (
            <div key={machine.id} data-scroll-target={`d-${index}`} className="h-full scroll-mt-28">
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
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={handleLoadMore}
            disabled={isLoading}
            variant="outline"
            className="min-w-[200px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />{copy("Loading...")}</>
            ) : (
              copy('Load More Machines')
            )}
          </Button>
        </div>
      )}
    </div>
  );
});

VirtualizedMachineGrid.displayName = 'VirtualizedMachineGrid';
