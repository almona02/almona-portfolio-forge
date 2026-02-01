import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
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
}) => {
  const panelState = useFabricatorUIStore((state) => state.panelStates[sectionId]);
  const togglePanel = useFabricatorUIStore((state) => state.togglePanel);
  const isCollapsed = position === 'left' ? panelState.leftCollapsed : panelState.rightCollapsed;
  const panelWidth = isCollapsed ? widthCollapsed : widthExpanded;
  
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [position, sectionId, togglePanel]);
  
  // Handle resizing
  useEffect(() => {
    if (!resizable || !isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      
      const rect = panelRef.current.getBoundingClientRect();
      const newWidth = position === 'left' 
        ? e.clientX - rect.left 
        : rect.right - e.clientX;
      
      if (newWidth >= 200 && newWidth <= 600) {
        // Update width in store (would need to extend store)
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
  }, [resizable, isResizing, position]);
  
  const handleToggle = () => {
    togglePanel(sectionId, position);
  };
  
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };
  
  return (
    <div
      ref={panelRef}
      className={cn(
        'relative flex flex-col h-full transition-all duration-300 ease-in-out',
        'bg-gray-900/50 border-amber-600/30 backdrop-blur-sm',
        position === 'left' ? 'border-r' : 'border-l',
        isCollapsed && 'shadow-lg',
        className
      )}
      style={{ 
        width: `${panelWidth}px`,
        minWidth: `${isCollapsed ? widthCollapsed : widthExpanded}px`,
        flexShrink: 0, // Prevent panel from shrinking below its width
      }}
    >
      {/* Header */}
      <div 
        className={cn(
          'flex items-center justify-between border-b border-amber-600/30',
          'hover:bg-gray-800/50 transition-colors cursor-pointer',
          isCollapsed ? 'justify-center p-2' : 'p-2 px-3'
        )}
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleToggle()}
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
            <div className="flex items-center space-x-2">
              {icon && <span className="text-amber-400">{icon}</span>}
              <h3 className="text-sm font-semibold text-gray-200 truncate">{title}</h3>
            </div>
            <button
              className="p-1 rounded hover:bg-gray-700/50"
              aria-label={position === 'left' ? 'Collapse left panel' : 'Collapse right panel'}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
            >
              {position === 'left' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
          </>
        )}
      </div>
      
      {/* Content */}
      <div 
        className={cn(
          'flex-1 overflow-y-auto transition-opacity duration-200',
          isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
      >
        {!isCollapsed && children}
      </div>
      
      {/* Resize handle */}
      {resizable && !isCollapsed && (
        <div
          className={cn(
            'absolute top-0 bottom-0 w-1 cursor-col-resize',
            'hover:bg-amber-500/50 active:bg-amber-500',
            position === 'left' ? '-right-0.5' : '-left-0.5'
          )}
          onMouseDown={handleResizeStart}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <GripVertical size={12} className="text-gray-500" />
          </div>
        </div>
      )}
    </div>
  );
};
