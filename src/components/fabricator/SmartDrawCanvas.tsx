import React, { useEffect, useState } from 'react';
import { Plus, Minus, Columns, Rows } from 'lucide-react';
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
  // Local state to track the "active" cell for styling
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
        // Cycle types: Fixed -> Sash -> Sliding -> Panel -> Empty -> Fixed
        const types = ['fixed', 'sash', 'sliding', 'panel', 'empty'] as const;
        const currentIndex = types.indexOf(cell.type as any);
        const nextType = types[(currentIndex + 1) % types.length];
        return { ...cell, type: nextType };
      }
      return cell;
    });

    onGridChange({ ...grid, cells: newCells });
  };

  // SVG ViewBox calculations
  const svgWidth = 1000;
  const svgHeight = (height / width) * 1000;
  
  // Calculate cell dimensions
  const cellWidth = svgWidth / grid.cols;
  const cellHeight = svgHeight / grid.rows;

  // ENHANCED VISUALS: Upgrade the styling functions
    const getCellFill = (type: string, isHovered: boolean) => {
        const baseColor = {
            'fixed': 'rgba(59, 130, 246, 0.1)',   // Blue
            'sash': 'rgba(34, 197, 94, 0.1)',    // Green
            'sliding': 'rgba(234, 179, 8, 0.1)',  // Yellow
            'panel': 'rgba(107, 114, 128, 0.2)', // Grey
            'empty': 'rgba(239, 68, 68, 0.05)',  // Red
        }[type] || 'transparent';

        return isHovered ? 'rgba(255, 255, 255, 0.1)' : baseColor;
    };

    const getCellStroke = (type: string) => {
        return {
            'fixed': '#3b82f6',
            'sash': '#22c55e',
            'sliding': '#eab308',
            'panel': '#6b7280',
            'empty': '#ef4444',
        }[type] || '#4b5563';
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

      {/* Canvas Area with Enhanced Styling */}
       <div className="relative w-full aspect-video bg-gray-950 border border-gray-800 rounded-lg overflow-hidden flex items-center justify-center p-4 shadow-inner">
        <div className="relative shadow-2xl w-full h-full">
          {/* SVG Grid Renderer */}
          <svg 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="w-full h-full"
             preserveAspectRatio="xMidYMid meet"
          >
             {/* Add a subtle background grid */}
            {Array.from({ length: grid.cols - 1 }).map((_, i) => (
                <line key={`v-${i}`} x1={(i + 1) * (svgWidth / grid.cols)} y1="0" x2={(i + 1) * (svgWidth / grid.cols)} y2={svgHeight} stroke="#374151" strokeWidth="0.5" strokeDasharray="10 10"/>
            ))}
            {Array.from({ length: grid.rows - 1 }).map((_, i) => (
                <line key={`h-${i}`} x1="0" y1={(i + 1) * (svgHeight / grid.rows)} x2={svgWidth} y2={(i + 1) * (svgHeight / grid.rows)} stroke="#374151" strokeWidth="0.5" strokeDasharray="10 10"/>
            ))}

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
                  fill={getCellFill(cell.type, hoveredCell === cell.id)}
                  stroke={getCellStroke(cell.type)}
                  strokeWidth={hoveredCell === cell.id ? 4 : 1.5}
                  strokeDasharray={cell.type === 'empty' ? '10 10' : 'none'}
                  className="transition-all duration-150"
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
                
                {/* Sliding Arrow Indicator (if sliding) */}
                {cell.type === 'sliding' && (
                   <g>
                     <path
                        d={`
                          M ${cell.col * cellWidth + cellWidth * 0.2} ${cell.row * cellHeight + cellHeight * 0.5} 
                          L ${cell.col * cellWidth + cellWidth * 0.8} ${cell.row * cellHeight + cellHeight * 0.5}
                          L ${cell.col * cellWidth + cellWidth * 0.7} ${cell.row * cellHeight + cellHeight * 0.4}
                          M ${cell.col * cellWidth + cellWidth * 0.8} ${cell.row * cellHeight + cellHeight * 0.5}
                          L ${cell.col * cellWidth + cellWidth * 0.7} ${cell.row * cellHeight + cellHeight * 0.6}
                        `}
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeOpacity="0.6"
                     />
                   </g>
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
          
           {/* Legend Overlay */}
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur p-2 rounded text-[10px] text-gray-300 flex flex-col gap-1 pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500/50 border border-blue-500" /> Fixed
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500/50 border border-green-500" /> Sash
          </div>
           <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500/50 border border-yellow-500" /> Sliding
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-gray-500/50 border border-gray-500" /> Panel
          </div>
        </div>

        </div>
      </div>
    </div>
  );
};
