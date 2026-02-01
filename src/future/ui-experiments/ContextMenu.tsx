import { cn } from '@/lib/utils';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  divider?: boolean;
  variant?: 'default' | 'destructive';
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
  className?: string;
}

/**
 * ContextMenu Component
 * 
 * Right-click context menu with keyboard navigation and portal rendering.
 * Market leader-inspired UX (Figma, VS Code patterns).
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({
  items,
  position,
  onClose,
  className = '',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isVisible, setIsVisible] = useState(false);

  // Filter out divider-only items for keyboard navigation
  const navigableItems = items.filter((item) => !item.divider);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  // Position menu to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position if menu would overflow
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 8;
    }
    if (x < 8) x = 8;

    // Adjust vertical position if menu would overflow
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 8;
    }
    if (y < 8) y = 8;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }, [position]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;

        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev < navigableItems.length - 1 ? prev + 1 : 0
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => 
            prev > 0 ? prev - 1 : navigableItems.length - 1
          );
          break;

        case 'Enter':
        case ' ':
          if (selectedIndex >= 0 && selectedIndex < navigableItems.length) {
            e.preventDefault();
            const item = navigableItems[selectedIndex];
            if (!item.disabled) {
              item.onClick();
              onClose();
            }
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, selectedIndex, navigableItems, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use capture phase to catch clicks before they bubble
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [onClose]);

  // Map selectedIndex to actual item index (accounting for dividers)
  const getActualIndex = useCallback((navIndex: number): number => {
    const actualIndex = 0;
    let navCount = 0;
    for (let i = 0; i < items.length; i++) {
      if (!items[i].divider) {
        if (navCount === navIndex) return i;
        navCount++;
      } else {
        if (navCount === navIndex) return -1; // Divider selected (shouldn't happen)
      }
    }
    return actualIndex;
  }, [items]);

  const actualSelectedIndex = selectedIndex >= 0 ? getActualIndex(selectedIndex) : -1;

  const menuContent = (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Context menu"
      className={cn(
        'fixed z-50 min-w-[180px] rounded-lg shadow-xl',
        'bg-gray-900/95 backdrop-blur-md border border-amber-600/30',
        'py-1 transition-opacity duration-200',
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${index}`}
              className="h-px bg-amber-600/20 my-1 mx-2"
              role="separator"
            />
          );
        }

        const isSelected = index === actualSelectedIndex;

        return (
          <button
            key={index}
            role="menuitem"
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-sm',
              'transition-colors',
              'focus:outline-none',
              isSelected && 'bg-amber-900/30',
              item.disabled
                ? 'text-gray-500 cursor-not-allowed'
                : item.variant === 'destructive'
                ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300'
                : 'text-gray-300 hover:bg-amber-900/20 hover:text-amber-200',
              'first:rounded-t-lg last:rounded-b-lg'
            )}
            aria-disabled={item.disabled}
          >
            {item.icon && (
              <span className="w-4 h-4 flex items-center justify-center">
                {item.icon}
              </span>
            )}
            <span className="flex-1 text-left">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  // Render to portal
  return createPortal(menuContent, document.body);
};
