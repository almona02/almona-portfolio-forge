import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Undo2, Redo2, Save, Home, Pin, PinOff } from 'lucide-react';
import { useFabricatorUIStore } from '@/stores/fabricatorUIStore';
import { ZoomPresets } from '../ui/ZoomPresets';

interface ToolbarItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  shortcut?: string;
}

interface QuickAccessToolbarProps {
  sectionTools?: ToolbarItem[];
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onHome?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  className?: string;
}

export const QuickAccessToolbar: React.FC<QuickAccessToolbarProps> = ({
  sectionTools = [],
  onUndo,
  onRedo,
  onSave,
  onHome,
  canUndo = false,
  canRedo = false,
  className = '',
}) => {
  const {
    quickAccessToolbarVisible,
    quickAccessToolbarPinned,
    quickAccessToolbarPosition,
    setQuickAccessToolbarVisible,
    setQuickAccessToolbarPinned,
  } = useFabricatorUIStore();
  
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    isHoveredRef.current = isHovered;
  }, [isHovered]);
  
  const standardTools: ToolbarItem[] = [
    {
      icon: <Undo2 size={16} />,
      label: 'Undo',
      onClick: onUndo || (() => {}),
      disabled: !canUndo,
      shortcut: 'Ctrl+Z',
    },
    {
      icon: <Redo2 size={16} />,
      label: 'Redo',
      onClick: onRedo || (() => {}),
      disabled: !canRedo,
      shortcut: 'Ctrl+Y',
    },
    {
      icon: <Save size={16} />,
      label: 'Save',
      onClick: onSave || (() => {}),
      shortcut: 'Ctrl+S',
    },
    {
      icon: <Home size={16} />,
      label: 'Home',
      onClick: onHome || (() => {}),
      shortcut: 'Ctrl+H',
    },
  ];
  
  const allTools = [...standardTools, ...sectionTools];
  
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    if (!quickAccessToolbarPinned && quickAccessToolbarVisible) {
      const timer = setTimeout(() => {
        if (!isHoveredRef.current) {
          setQuickAccessToolbarVisible(false);
        }
      }, 3000); // Hide after 3 seconds of inactivity
      
      inactivityTimerRef.current = timer;
    }
  }, [quickAccessToolbarPinned, quickAccessToolbarVisible, setQuickAccessToolbarVisible]);
  
  useEffect(() => {
    const handleMouseMove = () => {
      setQuickAccessToolbarVisible(true);
      resetInactivityTimer();
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [resetInactivityTimer, setQuickAccessToolbarVisible]);
  
  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [resetInactivityTimer]);
  
  if (!quickAccessToolbarVisible) return null;
  
  const getPositionClasses = () => {
    switch (quickAccessToolbarPosition) {
      case 'top':
        return 'top-5 left-1/2 transform -translate-x-1/2';
      case 'right':
        return 'top-1/2 right-5 transform -translate-y-1/2';
      case 'left':
        return 'top-1/2 left-5 transform -translate-y-1/2';
      case 'floating':
        return 'bottom-5 right-5';
      default: // bottom-right
        return 'bottom-5 right-5';
    }
  };
  
  const handlePinToggle = () => {
    setQuickAccessToolbarPinned(!quickAccessToolbarPinned);
  };
  
  return (
    <div
      className={cn(
        'fixed z-50 transition-all duration-300',
        getPositionClasses(),
        isHovered || quickAccessToolbarPinned ? 'opacity-100' : 'opacity-80',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn(
        'flex items-center rounded-lg shadow-xl backdrop-blur-sm',
        'bg-gray-900/90 border border-gray-700/50',
        quickAccessToolbarPosition === 'top' || quickAccessToolbarPosition === 'bottom' 
          ? 'px-4 py-2 space-x-2' 
          : 'flex-col py-2 space-y-2'
      )}>
        {/* Pin toggle */}
        <button
          onClick={handlePinToggle}
          className={cn(
            'p-1.5 rounded transition-colors',
            'hover:bg-gray-800/50',
            quickAccessToolbarPinned 
              ? 'text-amber-400 hover:text-amber-300' 
              : 'text-gray-500 hover:text-gray-400'
          )}
          aria-label={quickAccessToolbarPinned ? 'Unpin toolbar' : 'Pin toolbar'}
        >
          {quickAccessToolbarPinned ? <Pin size={14} /> : <PinOff size={14} />}
        </button>
        
        <div className={cn(
          quickAccessToolbarPosition === 'top' || quickAccessToolbarPosition === 'bottom' 
            ? 'w-px h-6 bg-gray-700/50' 
            : 'h-px w-6 bg-gray-700/50'
        )} />
        
        {/* Zoom Presets */}
        <ZoomPresets workspaceType="default" size="sm" variant="ghost" className="mx-1" />
        
        <div className={cn(
          quickAccessToolbarPosition === 'top' || quickAccessToolbarPosition === 'bottom' 
            ? 'w-px h-6 bg-gray-700/50' 
            : 'h-px w-6 bg-gray-700/50'
        )} />
        
        {/* Tools */}
        {allTools.map((tool, index) => (
          <button
            key={index}
            onClick={tool.onClick}
            disabled={tool.disabled}
            className={cn(
              'p-2 rounded transition-all duration-150',
              'hover:bg-gray-800/50 hover:scale-105',
              'active:scale-95',
              'focus:outline-none focus:ring-2 focus:ring-amber-500/50',
              tool.disabled && 'opacity-50 cursor-not-allowed'
            )}
            aria-label={tool.label}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
          >
            <div className="relative">
              {tool.icon}
              {tool.disabled && (
                <div className="absolute inset-0 bg-gray-900/50 rounded" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
