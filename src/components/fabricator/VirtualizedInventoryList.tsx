/**
 * Virtualized Inventory List Component
 * Uses TanStack Virtual for efficient rendering of large inventory lists
 * Replaces the non-virtualized list in InventoryDashboard
 */

import type { Profile } from '@/types/fabricator';
import { useVirtualizer } from '@tanstack/react-virtual';
import React from 'react';

interface VirtualizedInventoryListProps {
  profiles: Profile[];
  renderProfile: (profile: Profile, index: number) => React.ReactNode;
  containerHeight?: number;
  itemHeight?: number;
}

// ✅ PERFORMANCE: Virtualization threshold - only virtualize when list is large enough
const VIRTUALIZATION_THRESHOLD = 50;

export const VirtualizedInventoryList: React.FC<VirtualizedInventoryListProps> = ({
  profiles,
  renderProfile,
  containerHeight = 600,
  itemHeight = 180, // Inventory cards are taller than profile cards
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  // ✅ PERFORMANCE: Only virtualize if list is large enough to benefit
  const shouldVirtualize = profiles.length >= VIRTUALIZATION_THRESHOLD;

  // ✅ FIX: Always call hooks unconditionally (Rules of Hooks)
  // Always initialize virtualizer, but only use it when shouldVirtualize is true
  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? profiles.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5, // Render 5 extra items outside viewport for smooth scrolling
  });

  if (profiles.length === 0) {
    return null;
  }

  // For small lists, render normally (no virtualization overhead)
  if (!shouldVirtualize) {
    return (
      <div className="space-y-4">
        {profiles.map((profile, index) => (
          <div key={profile.id}>
            {renderProfile(profile, index)}
          </div>
        ))}
      </div>
    );
  }

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

