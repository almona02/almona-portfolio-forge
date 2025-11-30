import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Plus, Minus, Grid3X3, Maximize, Columns, Rows } from 'lucide-react';
import { WindowGrid, GridCell } from '@/types/fabricator';
import { cn } from '@/lib/utils';

interface SmartDrawProps {
  width: number;
  height: number;
  grid: WindowGrid;
  onGridChange: (grid: WindowGrid) => void;
  className?: string;
}

export const SmartDrawCanvas: React.FC<SmartDrawProps> = ({
  width,
  height,
  grid,
  onGridChange,
  className
}) => {
  // Local state to track the "active" cell for styling (optional)
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Initialize grid if empty (fallback safety)
  useEffect(() => {
    if (!grid || !grid.cells || grid.cells.length === 0) {
      onGridChange({
        rows: 1,
        cols: 1,
        cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }]
      });
    }
  }, [grid, onGridChange]);

  const updateGridStructure = (newRows: number, newCols: number) => {
    // Create new cells array based on new dimensions
    // Preserve existing cell types where possible
    const newCells: GridCell[] = [];
    
    for (let r = 0; r < newRows; r++) {
      for (let c = 0; c < newCols; c++) {
        // Try to find existing cell at this position
        const existing = grid.cells.find(cell => cell.row === r && cell.col === c);
        
        if (existing) {
          newCells.push(existing);
        } else {
          newCells.push({
            id: `${r}-${c}`,
            row: r,
            col: c,
            type: 'fixed' // Default new cells to fixed
          });
        }
      }
    }

    onGridChange({
      rows: newRows,
      cols: newCols,
      cells: newCells
    });
  };

  const handleCellClick = (cellId: string) => {
    const newCells = grid.cells.map(cell => {
      if (cell.id === cellId) {
        // Cycle types: Fixed -> Sash -> Panel -> Empty -> Fixed
        const types = ['fixed', 'sash', 'panel', 'empty'] as const;
        const currentIndex = types.indexOf(cell.type as any);
        const nextType = types[(currentIndex + 1) % types.length];
        return { ...cell, type: nextType };
      }
      return cell;
    });

    onGridChange({ ...grid, cells: newCells });
  };

  // SVG ViewBox calculations
  // We use a normalized coordinate system 0-100 for simplicity in SVG, 
  // but aspect ratio is handled by the container
  const svgWidth = 1000;
  const svgHeight = (height / width) * 1000;
  
  // Calculate cell dimensions
  const cellWidth = svgWidth / grid.cols;
  const cellHeight = svgHeight / grid.rows;

  const getCellColor = (type: string) => {
    switch (type) {
      case 'fixed': return 'rgba(59, 130, 246, 0.1)'; // Blue tint
      case 'sash': return 'rgba(34, 197, 94, 0.1)'; // Green tint
      case 'panel': return 'rgba(107, 114, 128, 0.5)'; // Grey opaque
      case 'empty': return 'transparent';
      default: return 'transparent';
    }
  };

  const getCellBorder = (type: string) => {
    switch (type) {
      case 'fixed': return '#3b82f6';
      case 'sash': return '#22c55e';
      case 'panel': return '#4b5563';
      case 'empty': return '#ef4444'; // Red for empty/error
      default: return '#374151';
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Controls Toolbar */}
      <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded-lg border border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Columns className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-400 uppercase">Cols</span>
            <div className="flex items-center bg-gray-800 rounded">
              <button 
                onClick={() => updateGridStructure(grid.rows, Math.max(1, grid.cols - 1))}
                className="p-1 hover:bg-gray-700 text-white transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-sm font-mono">{grid.cols}</span>
              <button 
                onClick={() => updateGridStructure(grid.rows, Math.min(6, grid.cols + 1))}
                className="p-1 hover:bg-gray-700 text-white transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="w-px h-6 bg-gray-800" />

          <div className="flex items-center gap-2">
            <Rows className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-400 uppercase">Rows</span>
            <div className="flex items-center bg-gray-800 rounded">
              <button 
                onClick={() => updateGridStructure(Math.max(1, grid.rows - 1), grid.cols)}
                className="p-1 hover:bg-gray-700 text-white transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center text-sm font-mono">{grid.rows}</span>
              <button 
                onClick={() => updateGridStructure(Math.min(4, grid.rows + 1), grid.cols)}
                className="p-1 hover:bg-gray-700 text-white transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 font-mono">
          {grid.cols}x{grid.rows} Grid
        </div>
      </div>

      {/* Canvas Area */}
      <div className="relative w-full flex-1 bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex items-center justify-center p-8">
        <div className="relative shadow-2xl" style={{ aspectRatio: `${width}/${height}`, maxHeight: '100%', maxWidth: '100%' }}>
          {/* SVG Grid Renderer */}
          <svg 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="w-full h-full bg-gray-950"
          >
            {/* Render Cells */}
            {grid.cells.map((cell) => (
              <g 
                key={cell.id}
                onClick={() => handleCellClick(cell.id)}
                onMouseEnter={() => setHoveredCell(cell.id)}
                onMouseLeave={() => setHoveredCell(null)}
                className="cursor-pointer transition-opacity hover:opacity-80"
              >
                {/* Cell Rect */}
                <rect
                  x={cell.col * cellWidth}
                  y={cell.row * cellHeight}
                  width={cellWidth}
                  height={cellHeight}
                  fill={getCellColor(cell.type)}
                  stroke={getCellBorder(cell.type)}
                  strokeWidth={hoveredCell === cell.id ? 4 : 2}
                />

                {/* Cell Type Label/Icon */}
                <text
                  x={cell.col * cellWidth + cellWidth / 2}
                  y={cell.row * cellHeight + cellHeight / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={Math.min(cellWidth, cellHeight) * 0.2}
                  fontWeight="bold"
                  className="pointer-events-none select-none opacity-50"
                >
                  {cell.type.toUpperCase()}
                </text>

                {/* Sash Triangle Indicator (if sash) */}
                {cell.type === 'sash' && (
                  <path
                    d={`
                      M ${cell.col * cellWidth} ${cell.row * cellHeight} 
                      L ${cell.col * cellWidth + cellWidth} ${cell.row * cellHeight + cellHeight / 2} 
                      L ${cell.col * cellWidth} ${cell.row * cellHeight + cellHeight}
                    `}
                    fill="none"
                    stroke="white"
                    strokeWidth="1"
                    strokeOpacity="0.3"
                  />
                )}
                
                {/* Cross for Panel */}
                {cell.type === 'panel' && (
                  <path
                    d={`
                      M ${cell.col * cellWidth} ${cell.row * cellHeight} 
                      L ${cell.col * cellWidth + cellWidth} ${cell.row * cellHeight + cellHeight}
                      M ${cell.col * cellWidth + cellWidth} ${cell.row * cellHeight}
                      L ${cell.col * cellWidth} ${cell.row * cellHeight + cellHeight}
                    `}
                    fill="none"
                    stroke="white"
                    strokeWidth="1"
                    strokeOpacity="0.1"
                  />
                )}
              </g>
            ))}

            {/* Outer Frame Border */}
            <rect 
              x="0" y="0" 
              width={svgWidth} 
              height={svgHeight} 
              fill="none" 
              stroke="#4b5563" 
              strokeWidth="4" 
            />
          </svg>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur p-2 rounded text-[10px] text-gray-300 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500/50 border border-blue-500" /> Fixed
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500/50 border border-green-500" /> Sash
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-500/50 border border-gray-500" /> Panel
          </div>
        </div>
      </div>
    </div>
  );
};
