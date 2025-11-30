/**
 * Virtualized Machine Grid Component
 * Uses TanStack Virtual for efficient rendering of large machine lists
 * Replaces the non-virtualized implementation
 */

import React, { memo, useMemo } from 'react';
// @ts-expect-error - @tanstack/react-virtual types may not be available
import { useVirtualizer } from '@tanstack/react-virtual';
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

// Calculate item size based on grid layout
const getItemSize = (_index: number, _containerWidth: number) => {
  // Card height is approximately 400px
  const cardHeight = 400;
  const gap = 24;
  const rowHeight = cardHeight + gap;

  // Return row height (all items in a row have the same height)
  return rowHeight;
};

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
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(1024);

  // Measure container width for responsive grid
  React.useEffect(() => {
    const updateWidth = () => {
      if (parentRef.current) {
        setContainerWidth(parentRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate grid columns
  const columns = useMemo(() => {
    if (containerWidth >= 1280) return 4;
    if (containerWidth >= 1024) return 3;
    if (containerWidth >= 768) return 2;
    return 1;
  }, [containerWidth]);

  // Calculate rows needed
  const rows = Math.ceil(machines.length / columns);

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      // Estimate row height based on first item in row
      const firstItemInRow = index * columns;
      return getItemSize(firstItemInRow, containerWidth);
    },
    overscan: 2, // Render 2 extra rows for smooth scrolling
  });

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div className="w-full">
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '600px' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualRows.map((virtualRow) => {
            const startIndex = virtualRow.index * columns;
            const endIndex = Math.min(startIndex + columns, machines.length);
            const rowMachines = machines.slice(startIndex, endIndex);

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 xl:gap-8 px-4`}>
                  {rowMachines.map((machine) => {
                    const isSelected = selectedMachines.some(m => m.id === machine.id);
                    return (
                      <EnhancedProductCard
                        key={machine.id}
                        machine={machine}
                        isSelected={isSelected}
                        onSelect={onSelectMachine}
                        onQuoteRequest={onQuoteRequest}
                        on3DView={on3DView}
                        onQuickPreview={onQuickPreview}
                        show3DBadge={true}
                      />
                    );
                  })}
                  {/* Fill empty slots in last row */}
                  {Array.from({ length: columns - rowMachines.length }).map((_, idx) => (
                    <div key={`empty-${idx}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={onLoadMore}
            disabled={isLoading}
            variant="outline"
            className="min-w-[200px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Machines'
            )}
          </Button>
        </div>
      )}
    </div>
  );
});

VirtualizedMachineGrid.displayName = 'VirtualizedMachineGrid';
