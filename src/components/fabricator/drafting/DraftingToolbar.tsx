// src/components/fabricator/drafting/DraftingToolbar.tsx
import {
    ArrowRight,
    Circle,
    CircleDot,
    CircleDot as CircleDotIcon,
    Copy,
    CornerDownRight,
    FlipHorizontal,
    Grid3x3,
    GripVertical,
    Hand,
    Hexagon,
    Lock,
    Minus,
    Minus as MinusIcon,
    Minus as MinusLine,
    MousePointer,
    Move,
    RotateCw,
    Ruler,
    Scissors,
    Square,
    Type,
    Wrench,
    ZoomIn
} from 'lucide-react';
import React from 'react';
import { EnhancedTooltip } from './components/EnhancedTooltip';
import type { DraftingTool } from './types/drafting';
import { safeEventHandler, validateStringProp } from './utils/componentHardening';

interface DraftingToolbarProps {
  selectedTool?: DraftingTool;
  onToolSelect?: (tool: DraftingTool) => void;
}

interface ToolGroup {
  id: string;
  label?: string; // Optional label for future use
  tools: {
    id: DraftingTool;
    iconComponent: any; // Relaxed type to handle Lucide forwardRef components
    iconProps?: string;
    label: string;
  }[];
}

export const DraftingToolbar: React.FC<DraftingToolbarProps> = ({ 
  selectedTool = 'select',
  onToolSelect 
}) => {
  // Validate props
  const validatedSelectedTool = validateStringProp(selectedTool, 50, 'select', 'selectedTool', 'DraftingToolbar') as DraftingTool;
  
  // Safe event handler
  const handleToolSelect = safeEventHandler((tool: DraftingTool) => {
    onToolSelect?.(tool);
  }, 'DraftingToolbar', 'toolSelect');

  const toolGroups: ToolGroup[] = [
    {
      id: 'selection',
      tools: [
        { id: 'select', iconComponent: MousePointer, label: 'Select' },
        { id: 'pan', iconComponent: Hand, label: 'Pan' },
      ]
    },
    {
      id: 'drawing',
      // label: 'Draw',
      tools: [
        { id: 'rectangle', iconComponent: Square, label: 'Rectangle' },
        { id: 'circle', iconComponent: Circle, label: 'Circle' },
        { id: 'line', iconComponent: Minus, label: 'Line' },
        { id: 'arc', iconComponent: CircleDot, iconProps: 'opacity-70', label: 'Arc' },
        { id: 'polygon', iconComponent: Hexagon, label: 'Polygon' },
        { id: 'spline', iconComponent: CircleDot, iconProps: 'opacity-80', label: 'Spline' },
        { id: 'text', iconComponent: Type, label: 'Text' },
      ]
    },
    {
      id: 'measurement',
      tools: [
        { id: 'dimension', iconComponent: Ruler, label: 'Dimension' },
      ]
    },
    {
      id: 'hardware',
      tools: [
        { id: 'hinge', iconComponent: Wrench, label: 'Hinge' },
        { id: 'handle', iconComponent: GripVertical, label: 'Handle' },
        { id: 'lock', iconComponent: Lock, label: 'Lock' },
        { id: 'roller', iconComponent: CircleDot, label: 'Roller' },
      ]
    },
    {
      id: 'structural',
      tools: [
        { id: 'mullion', iconComponent: MinusIcon, iconProps: 'rotate-90', label: 'Mullion' },
        { id: 'transom', iconComponent: MinusIcon, label: 'Transom' },
      ]
    },
    {
      id: 'transform',
      tools: [
        { id: 'mirror', iconComponent: FlipHorizontal, label: 'Mirror' },
        { id: 'rotate', iconComponent: RotateCw, label: 'Rotate' },
        { id: 'scale', iconComponent: ZoomIn, label: 'Scale' },
      ]
    },
    {
      id: 'arrays',
      tools: [
        { id: 'array-rectangular', iconComponent: Grid3x3, label: 'Rect Array' },
        { id: 'array-circular', iconComponent: CircleDotIcon, label: 'Circ Array' },
        { id: 'array-linear', iconComponent: MinusLine, label: 'Linear Array' },
        { id: 'pattern-offset', iconComponent: Move, label: 'Offset' },
      ]
    },
    {
      id: 'edit',
      tools: [
        { id: 'trim', iconComponent: Scissors, label: 'Trim' },
        { id: 'extend', iconComponent: ArrowRight, label: 'Extend' },
        { id: 'fillet', iconComponent: CornerDownRight, label: 'Fillet' },
        { id: 'chamfer', iconComponent: CornerDownRight, iconProps: 'rotate-45', label: 'Chamfer' },
        { id: 'offset', iconComponent: Copy, label: 'Offset' },
      ]
    }
  ];

  return (
    <div className="flex flex-col gap-2 p-1 py-2">
      {toolGroups.map((group, groupIndex) => (
        <React.Fragment key={group.id}>
          {groupIndex > 0 && (
             <div className="mx-2 h-[1px] bg-slate-700/50 my-0.5" />
          )}
          <div className="flex flex-col gap-0.5">
            {group.tools.map((tool) => {
              const isActive = validatedSelectedTool === tool.id;
              const IconComponent = tool.iconComponent;
              const iconColorClass = isActive ? 'text-amber-400' : 'text-slate-400';
              const iconClassName = tool.iconProps 
                ? `${iconColorClass} ${tool.iconProps}` 
                : iconColorClass;
              
              return (
                <div key={tool.id} className="relative group">
                  <EnhancedTooltip toolKey={tool.id} placement="right" delay={300}>
                    <button
                      className={`
                        relative w-full flex items-center justify-center
                        p-2 transition-all duration-200 ease-in-out
                        rounded-md
                        ${isActive 
                          ? 'bg-amber-500/10 border border-amber-500/30' 
                          : 'bg-transparent border border-transparent hover:bg-slate-700/50'
                        }
                      `}
                      onClick={() => handleToolSelect(tool.id)}
                      aria-label={tool.label}
                      aria-pressed={isActive}
                      role="button"
                      tabIndex={0}
                    >
                      {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3/4 bg-amber-500 rounded-r-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      )}
                      <IconComponent size={18} className={`${iconClassName} transition-colors duration-200`} />
                      <span className="sr-only">{tool.label}</span>
                    </button>
                  </EnhancedTooltip>
                </div>
              );
            })}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
