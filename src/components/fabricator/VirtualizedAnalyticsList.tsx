/**
 * Virtualized Analytics List Component
 * Uses TanStack Virtual for efficient rendering of analytics data
 * Used in PersonalAnalyticsDashboard for profile health and trends
 */

import React from 'react';
// @ts-expect-error - @tanstack/react-virtual types may not be available
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualizedAnalyticsListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight?: number;
  itemHeight?: number;
  className?: string;
}

export function VirtualizedAnalyticsList<T>({
  items,
  renderItem,
  containerHeight = 400,
  itemHeight = 100,
  className = '',
}: VirtualizedAnalyticsListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 3,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height: `${containerHeight}px` }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
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
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

