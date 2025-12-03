/**
 * Machine Grid Component
 * Simple grid layout for machine cards with proper spacing and alignment
 */

import React, { memo } from 'react';
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
  return (
    <div className="w-full">
      {/* Simple CSS Grid - cards auto-size to content with equal heights per row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
        {machines.map((machine) => {
          const isSelected = selectedMachines.some(m => m.id === machine.id);
          return (
            <div key={machine.id} className="h-full">
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
