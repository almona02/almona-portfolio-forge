/**
 * MultiSelectGrid Component
 * 
 * Phase 3 Implementation - Enterprise Grid with Multi-Selection
 * Generic grid/list component with multi-selection, virtualization, and accessibility.
 * 
 * Gold Tier Implementation:
 * - Market-leading UX inspired by Gmail, Linear, Notion
 * - ARIA compliant (WCAG 2.1 AA)
 * - Performance optimized (virtualization for 100+ items)
 * - Accessible (keyboard navigation, screen reader support)
 */

import { cn } from '@/lib/utils';
import { Checkbox } from '@/shared/ui/ui/checkbox';
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Grid column definition
 */
export interface GridColumn<T> {
  id: string;
  header: string;
  width?: number | string;
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
}

/**
 * MultiSelectGrid component props
 */
export interface MultiSelectGridProps<T> {
  items: T[];
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  renderItem: (item: T, isSelected: boolean) => React.ReactNode;
  getItemId: (item: T) => string;
  columns?: GridColumn<T>[];
  virtualized?: boolean;  // default: true for 100+ items
  rowHeight?: number;  // default: 48
  className?: string;
  selectOnRowClick?: boolean;  // default: false
  onItemClick?: (item: T) => void;
  containerHeight?: number;  // Height for virtualized container
  showHeader?: boolean;  // Show header with select all checkbox
}

/**
 * Virtualization threshold
 */
const VIRTUALIZATION_THRESHOLD = 100;

/**
 * MultiSelectGrid Component
 */
export function MultiSelectGrid<T>({
  items,
  selectedIds,
  onSelectionChange,
  renderItem,
  getItemId,
  columns,
  virtualized = items.length >= VIRTUALIZATION_THRESHOLD,
  rowHeight = 48,
  className,
  selectOnRowClick = false,
  onItemClick,
  containerHeight = 600,
  showHeader = true,
}: MultiSelectGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [selectAllState, setSelectAllState] = useState<'none' | 'some' | 'all'>('none');

  // Calculate select all state
  useEffect(() => {
    if (items.length === 0) {
      setSelectAllState('none');
      return;
    }
    
    const selectedCount = items.filter(item => selectedIds.has(getItemId(item))).length;
    if (selectedCount === 0) {
      setSelectAllState('none');
    } else if (selectedCount === items.length) {
      setSelectAllState('all');
    } else {
      setSelectAllState('some');
    }
  }, [items, selectedIds, getItemId]);

  // Virtualizer
  const virtualizer = useVirtualizer({
    count: virtualized ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  /**
   * Toggle item selection
   */
  const toggleItemSelection = useCallback((itemId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    onSelectionChange(newSelection);
  }, [selectedIds, onSelectionChange]);

  /**
   * Handle select all/deselect all
   */
  const handleSelectAll = useCallback(() => {
    if (selectAllState === 'all') {
      // Deselect all
      onSelectionChange(new Set());
    } else {
      // Select all
      const allIds = new Set(items.map(item => getItemId(item)));
      onSelectionChange(allIds);
    }
  }, [selectAllState, items, getItemId, onSelectionChange]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(index + 1, items.length - 1);
      setFocusedIndex(nextIndex);
      // Scroll into view if virtualized
      if (virtualized && virtualizer) {
        virtualizer.scrollToIndex(nextIndex, { align: 'start' });
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(index - 1, 0);
      setFocusedIndex(prevIndex);
      // Scroll into view if virtualized
      if (virtualized && virtualizer) {
        virtualizer.scrollToIndex(prevIndex, { align: 'start' });
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      const itemId = getItemId(items[index]);
      toggleItemSelection(itemId);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      handleSelectAll();
    } else if (e.key === 'Enter' && onItemClick) {
      e.preventDefault();
      onItemClick(items[index]);
    }
  }, [items, getItemId, toggleItemSelection, handleSelectAll, onItemClick, virtualized, virtualizer]);

  /**
   * Handle row click
   */
  const handleRowClick = useCallback((item: T, _e: React.MouseEvent) => {
    if (selectOnRowClick) {
      const itemId = getItemId(item);
      toggleItemSelection(itemId);
    }
    if (onItemClick && !selectOnRowClick) {
      onItemClick(item);
    }
  }, [selectOnRowClick, getItemId, toggleItemSelection, onItemClick]);

  /**
   * Render header with select all checkbox
   */
  const renderHeader = () => {
    if (!showHeader) return null;

    const selectedCount = items.filter(item => selectedIds.has(getItemId(item))).length;
    const selectionText = selectedCount === 0
      ? '0 selected'
      : selectedCount === items.length
        ? `All ${items.length} selected`
        : `${selectedCount} of ${items.length} selected`;

    return (
      <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectAllState === 'all' ? true : selectAllState === 'some' ? 'indeterminate' : false}
            onCheckedChange={handleSelectAll}
            aria-label="Select all items"
            className="h-4 w-4"
          />
          <span className="text-sm text-slate-300" aria-live="polite">
            {selectionText}
          </span>
        </div>
        {columns && columns.length > 0 && (
          <div className="flex-1 grid grid-cols-[40px_repeat(auto-fit,minmax(100px,1fr))] gap-4">
            {columns.map((column) => (
              <div
                key={column.id}
                className="text-xs font-medium text-slate-400 uppercase tracking-wider"
                style={{ width: column.width }}
              >
                {column.header}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render non-virtualized list
  if (!virtualized || items.length < VIRTUALIZATION_THRESHOLD) {
    return (
      <div className={cn('flex flex-col bg-slate-900/50 border border-slate-700/50 rounded-lg', className)}>
        {renderHeader()}
        <ScrollArea className="flex-1">
          <div role="grid" aria-label="Multi-select grid" aria-multiselectable="true">
            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No items to display
              </div>
            ) : (
              items.map((item, index) => {
                const itemId = getItemId(item);
                const isSelected = selectedIds.has(itemId);
                const isFocused = focusedIndex === index;

                return (
                  <div
                    key={itemId}
                    role="row"
                    aria-selected={isSelected}
                    tabIndex={isFocused ? 0 : -1}
                    onClick={(e) => handleRowClick(item, e)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 border-b border-slate-700/30 transition-colors',
                      'hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900',
                      isSelected && 'bg-slate-800/70',
                      isFocused && 'ring-2 ring-amber-400'
                    )}
                    style={{ minHeight: `${rowHeight}px` }}
                  >
                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItemSelection(itemId)}
                        aria-label={`Select item ${index + 1}`}
                        className="h-4 w-4"
                      />
                    </div>
                    <div className="flex-1">
                      {renderItem(item, isSelected)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Render virtualized list
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={cn('flex flex-col bg-slate-900/50 border border-slate-700/50 rounded-lg', className)}>
      {renderHeader()}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        style={{ height: `${containerHeight}px` }}
        role="grid"
        aria-label="Multi-select grid"
        aria-multiselectable="true"
        aria-rowcount={items.length}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {items.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No items to display
            </div>
          ) : (
            virtualItems.map((virtualItem) => {
              const item = items[virtualItem.index];
              const itemId = getItemId(item);
              const isSelected = selectedIds.has(itemId);
              const isFocused = focusedIndex === virtualItem.index;

              return (
                <div
                  key={virtualItem.key}
                  role="row"
                  aria-selected={isSelected}
                  aria-rowindex={virtualItem.index + 1}
                  tabIndex={isFocused ? 0 : -1}
                  onClick={(e) => handleRowClick(item, e)}
                  onKeyDown={(e) => handleKeyDown(e, virtualItem.index)}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3 border-b border-slate-700/30 transition-colors absolute left-0 right-0',
                    'hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900',
                    isSelected && 'bg-slate-800/70',
                    isFocused && 'ring-2 ring-amber-400'
                  )}
                  style={{
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleItemSelection(itemId)}
                      aria-label={`Select item ${virtualItem.index + 1}`}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="flex-1">
                    {renderItem(item, isSelected)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
