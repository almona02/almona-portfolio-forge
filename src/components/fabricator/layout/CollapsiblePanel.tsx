import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, GripVertical, X } from 'lucide-react';
import { useFabricatorUIStore, SectionId } from '@/stores/fabricatorUIStore';

interface CollapsiblePanelProps {
  position: 'left' | 'right';
  sectionId: SectionId;
  children: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
  widthExpanded?: number;
  widthCollapsed?: number;
  resizable?: boolean;
  className?: string;
  /**
   * docked — takes layout width (desktop)
   * overlay — fixed drawer; collapsed takes no space (narrow screens)
   */
  variant?: 'docked' | 'overlay';
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  position,
  sectionId,
  children,
  icon,
  title = 'Panel',
  widthExpanded = position === 'left' ? 240 : 320,
  widthCollapsed = 48,
  resizable = false,
  className = '',
  variant = 'docked',
}) => {
  const panelState = useFabricatorUIStore((state) => state.panelStates[sectionId]);
  const togglePanel = useFabricatorUIStore((state) => state.togglePanel);
  const isCollapsed = position === 'left' ? panelState.leftCollapsed : panelState.rightCollapsed;
  const isOverlay = variant === 'overlay';
  const panelWidth = isCollapsed ? widthCollapsed : widthExpanded;

  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOverlay && !isCollapsed) {
        e.preventDefault();
        togglePanel(sectionId, position);
        return;
      }
      if (e.ctrlKey && e.key === '[' && position === 'left') {
        e.preventDefault();
        togglePanel(sectionId, 'left');
      }
      if (e.ctrlKey && e.key === ']' && position === 'right') {
        e.preventDefault();
        togglePanel(sectionId, 'right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [position, sectionId, togglePanel, isOverlay, isCollapsed]);

  useEffect(() => {
    if (!isOverlay || isCollapsed) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOverlay, isCollapsed]);

  useEffect(() => {
    if (!resizable || !isResizing || isOverlay) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;

      const rect = panelRef.current.getBoundingClientRect();
      const newWidth = position === 'left'
        ? e.clientX - rect.left
        : rect.right - e.clientX;

      if (newWidth >= 200 && newWidth <= 600) {
        console.log('New width:', newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizable, isResizing, position, isOverlay]);

  const handleToggle = () => {
    togglePanel(sectionId, position);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Narrow overlay: hide completely when collapsed (header owns the open control)
  if (isOverlay && isCollapsed) {
    return null;
  }

  return (
    <>
      {isOverlay && !isCollapsed && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px] lg:hidden"
          aria-label={`Close ${title} panel`}
          onClick={handleToggle}
          data-testid="collapsible-panel-backdrop"
        />
      )}
      <div
        ref={panelRef}
        className={cn(
          'relative flex flex-col h-full transition-all duration-300 ease-in-out',
          'bg-gray-900/95 border-amber-600/30 backdrop-blur-sm',
          position === 'left' ? 'border-r' : 'border-l',
          isCollapsed && 'shadow-lg',
          isOverlay && 'fixed inset-y-0 z-50 shadow-2xl',
          isOverlay && position === 'left' && 'left-0',
          isOverlay && position === 'right' && 'right-0',
          className,
        )}
        style={{
          width: `${isOverlay ? widthExpanded : panelWidth}px`,
          minWidth: isOverlay
            ? `${widthExpanded}px`
            : `${isCollapsed ? widthCollapsed : widthExpanded}px`,
          maxWidth: isOverlay ? 'min(280px, 85vw)' : undefined,
          flexShrink: 0,
        }}
        data-variant={variant}
      >
        <div
          className={cn(
            'flex items-center justify-between border-b border-amber-600/30',
            'hover:bg-gray-800/50 transition-colors cursor-pointer',
            isCollapsed ? 'justify-center p-2' : 'p-2 px-3',
          )}
          onClick={handleToggle}
          role="button"
          tabIndex={0}
          aria-expanded={!isCollapsed}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggle();
            }
          }}
          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${title} panel`}
          title={isCollapsed ? `Click to expand ${title}` : `Click to collapse ${title}`}
        >
          {isCollapsed ? (
            <div className="flex items-center justify-center w-full h-8">
              {icon ? (
                <div className="text-amber-400 opacity-80 hover:opacity-100 transition-opacity">
                  {icon}
                </div>
              ) : (
                <div className="text-amber-400 opacity-80 hover:opacity-100 transition-opacity">
                  {position === 'left' ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center space-x-2 min-w-0">
                {icon && <span className="text-amber-400 shrink-0">{icon}</span>}
                <h3 className="text-sm font-semibold text-gray-200 truncate">{title}</h3>
              </div>
              <button
                type="button"
                className="p-1 rounded hover:bg-gray-700/50 shrink-0"
                aria-label={
                  isOverlay
                    ? `Close ${title} panel`
                    : position === 'left'
                      ? 'Collapse left panel'
                      : 'Collapse right panel'
                }
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle();
                }}
              >
                {isOverlay ? (
                  <X size={16} />
                ) : position === 'left' ? (
                  <ChevronLeft size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
            </>
          )}
        </div>

        <div
          className={cn(
            'flex-1 overflow-y-auto transition-opacity duration-200',
            isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100',
          )}
        >
          {!isCollapsed && children}
        </div>

        {resizable && !isCollapsed && !isOverlay && (
          <div
            className={cn(
              'absolute top-0 bottom-0 w-1 cursor-col-resize',
              'hover:bg-amber-500/50 active:bg-amber-500',
              position === 'left' ? '-right-0.5' : '-left-0.5',
            )}
            onMouseDown={handleResizeStart}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <GripVertical size={12} className="text-gray-500" />
            </div>
          </div>
        )}
      </div>
    </>
  );
};
