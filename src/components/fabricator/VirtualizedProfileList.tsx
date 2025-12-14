/**
 * Virtualized Profile List Component
 * Uses TanStack Virtual for efficient rendering of large profile lists
 * Replaces the non-virtualized list in ProfileManagement
 */

import type { Profile } from '@/types/fabricator';
import { useVirtualizer } from '@tanstack/react-virtual';
import React from 'react';

interface VirtualizedProfileListProps {
  profiles: Profile[];
  renderProfile: (profile: Profile, index: number) => React.ReactNode;
  containerHeight?: number;
  itemHeight?: number;
}

export const VirtualizedProfileList: React.FC<VirtualizedProfileListProps> = ({
  profiles,
  renderProfile,
  containerHeight = 600,
  itemHeight = 120,
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: profiles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5, // Render 5 extra items outside viewport for smooth scrolling
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ height: `${containerHeight}px` }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualItem) => {
          const profile = profiles[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderProfile(profile, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

