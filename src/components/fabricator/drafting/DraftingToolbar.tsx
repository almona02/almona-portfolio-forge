// src/components/fabricator/drafting/DraftingToolbar.tsx
import React from 'react';
import { Square, Ruler, MousePointer, Type, Minus, Circle } from 'lucide-react';
import type { DraftingTool } from './types/drafting';

interface DraftingToolbarProps {
  selectedTool?: DraftingTool;
  onToolSelect?: (tool: DraftingTool) => void;
}

export const DraftingToolbar: React.FC<DraftingToolbarProps> = ({ 
  selectedTool = 'select',
  onToolSelect 
}) => {
  const tools: { id: DraftingTool; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer size={20} />, label: 'Select' },
    { id: 'rectangle', icon: <Square size={20} />, label: 'Rectangle' },
    { id: 'dimension', icon: <Ruler size={20} />, label: 'Dimension' },
    { id: 'text', icon: <Type size={20} />, label: 'Text' },
    { id: 'line', icon: <Minus size={20} />, label: 'Line' },
    { id: 'circle', icon: <Circle size={20} />, label: 'Circle' },
  ];
  
  return (
    <div className="flex flex-col gap-2 p-2">
      {tools.map((tool) => (
        <button
          key={tool.id}
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === tool.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
          onClick={() => onToolSelect?.(tool.id)}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
};

