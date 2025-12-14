import { cn } from '@/lib/utils';
import { GridCell, WindowGrid } from '@/types/fabricator';
import { ChevronDown, ChevronUp, Columns, List, Rows } from 'lucide-react';
import React, { useEffect, useState } from 'react';

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
  const [colWidthsInput, setColWidthsInput] = useState('');
  const [rowHeightsInput, setRowHeightsInput] = useState('');
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Keep inputs in sync when grid changes (e.g., cols/rows adjusted)
  useEffect(() => {
    if (grid.colWidths && grid.colWidths.length === grid.cols) {
      setColWidthsInput(grid.colWidths.join(','));
    } else if (!colWidthsInput) {
      setColWidthsInput('');
    }
  }, [grid.cols, grid.colWidths, colWidthsInput]);

  useEffect(() => {
    if (grid.rowHeights && grid.rowHeights.length === grid.rows) {
      setRowHeightsInput(grid.rowHeights.join(','));
    } else if (!rowHeightsInput) {
      setRowHeightsInput('');
    }
  }, [grid.rows, grid.rowHeights, rowHeightsInput]);

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
    const newCells: GridCell[] = grid.cells.map(cell => {
      if (cell.id === cellId) {
        // Cycle: Fixed -> Sash(left) -> Sash(right) -> Sliding -> Panel -> Empty -> Fixed
        const cycle = ['fixed', 'sash-left', 'sash-right', 'sliding', 'panel', 'empty'] as const;
        const currentKey =
          cell.type === 'sash' && cell.openingDirection === 'right'
            ? 'sash-right'
            : cell.type === 'sash'
            ? 'sash-left'
            : (cell.type as any);
        const currentIndex = cycle.indexOf(currentKey as any);
        const nextKey = cycle[(currentIndex + 1) % cycle.length];

        if (nextKey === 'sash-left') {
          return { ...cell, type: 'sash' as const, openingDirection: 'left' as const };
        }
        if (nextKey === 'sash-right') {
          return { ...cell, type: 'sash' as const, openingDirection: 'right' as const };
        }
        // Ensure type matches GridCell type
        const validType = (nextKey === 'fixed' || nextKey === 'sliding' || nextKey === 'panel' || nextKey === 'empty') 
          ? nextKey 
          : 'fixed';
        return { ...cell, type: validType as 'fixed' | 'sash' | 'sliding' | 'empty' | 'panel', openingDirection: undefined };
      }
      return cell;
    });

    onGridChange({ ...grid, cells: newCells });
  };

  // SVG ViewBox calculations - useMemo to ensure recalculation when grid changes
  const svgWidth = 1000;
  const svgHeight = (height / width) * 1000;
  
  // Calculate cell dimensions using proportional widths/heights if provided
  // Use useMemo to recalculate when grid structure changes
  const { colStarts, rowStarts, colWidthsPx, rowHeightsPx } = React.useMemo(() => {
    const cWeights = grid.colWidths && grid.colWidths.length === grid.cols ? grid.colWidths : Array(grid.cols).fill(1);
    const rWeights = grid.rowHeights && grid.rowHeights.length === grid.rows ? grid.rowHeights : Array(grid.rows).fill(1);
    const tColWeight = cWeights.reduce((a, b) => a + b, 0) || grid.cols;
    const tRowWeight = rWeights.reduce((a, b) => a + b, 0) || grid.rows;
    const cStarts = cWeights.map((_, idx) => (cWeights.slice(0, idx).reduce((a, b) => a + b, 0) / tColWeight) * svgWidth + offsetX);
    const rStarts = rWeights.map((_, idx) => (rWeights.slice(0, idx).reduce((a, b) => a + b, 0) / tRowWeight) * svgHeight + offsetY);
    const cWidthsPx = cWeights.map((w) => (w / tColWeight) * svgWidth);
    const rHeightsPx = rWeights.map((w) => (w / tRowWeight) * svgHeight);
    
    return {
      colStarts: cStarts,
      rowStarts: rStarts,
      colWidthsPx: cWidthsPx,
      rowHeightsPx: rHeightsPx
    };
  }, [grid.cols, grid.rows, grid.colWidths, grid.rowHeights, svgWidth, svgHeight, offsetX, offsetY]);

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
    <div className={cn("flex flex-col gap-4 items-center", className)}>
      {/* Controls Toolbar */}
      <div className="flex flex-col gap-3 bg-gray-900/50 p-3 rounded-lg border border-gray-800 items-center w-full max-w-4xl">
        {/* Row 1: Cols / Rows */}
        <div className="flex flex-wrap justify-center gap-3 w-full">
          <div className="flex flex-col items-center gap-1.5 bg-gray-800 rounded px-3 py-2 w-[96px]" title="Vertical divisions (sashes)">
            <Columns className="h-5 w-5 text-gray-100" />
            <div className="flex items-center gap-2">
              <button 
                onClick={() => updateGridStructure(grid.rows, Math.max(1, grid.cols - 1))}
                className="p-1 hover:bg-gray-700 text-white transition-colors rounded"
                aria-label="Decrease columns"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <span className="text-sm font-mono text-gray-200">{grid.cols}</span>
              <button 
                onClick={() => updateGridStructure(grid.rows, Math.min(12, grid.cols + 1))}
                className="p-1 hover:bg-gray-700 text-white transition-colors rounded"
                aria-label="Increase columns"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5 bg-gray-800 rounded px-3 py-2 w-[96px]" title="Horizontal divisions (mullions)">
            <Rows className="h-5 w-5 text-gray-100" />
            <div className="flex items-center gap-2">
              <button 
                onClick={() => updateGridStructure(Math.max(1, grid.rows - 1), grid.cols)}
                className="p-1 hover:bg-gray-700 text-white transition-colors rounded"
                aria-label="Decrease rows"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
              <span className="text-sm font-mono text-gray-200">{grid.rows}</span>
              <button 
                onClick={() => updateGridStructure(Math.min(8, grid.rows + 1), grid.cols)}
                className="p-1 hover:bg-gray-700 text-white transition-colors rounded"
                aria-label="Increase rows"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Absolute measures */}
        <div className="flex flex-wrap justify-center gap-3 w-full">
          <div className="flex flex-col gap-1 w-52" title="Comma-separated widths for each column (e.g. mm)">
            <div className="flex items-center gap-2 text-gray-300">
              <List className="h-4 w-4" />
              <button
                onClick={() => {
                  const equal = Array(grid.cols).fill(1);
                  setColWidthsInput(equal.join(','));
                  onGridChange({ ...grid, colWidths: equal });
                }}
                className="ml-auto text-[10px] px-2 py-1 bg-gray-800 border border-gray-700 rounded hover:border-orange-500"
                title="Set all columns equal"
              >
                =
              </button>
            </div>
            <input
              type="text"
              value={colWidthsInput}
              onChange={(e) => setColWidthsInput(e.target.value)}
              onBlur={() => {
                const parts = colWidthsInput.split(',').map((p) => parseFloat(p.trim())).filter((n) => !Number.isNaN(n) && n > 0);
                if (parts.length === grid.cols) {
                  onGridChange({ ...grid, colWidths: parts });
                } else if (!colWidthsInput.trim()) {
                  onGridChange({ ...grid, colWidths: undefined });
                }
              }}
              placeholder="600,800,600"
              className="w-full bg-gray-800 border border-gray-700 text-xs text-white rounded px-3 py-2 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex flex-col gap-1 w-52" title="Comma-separated heights for each row (e.g. mm)">
            <div className="flex items-center gap-2 text-gray-300">
              <List className="h-4 w-4" />
              <button
                onClick={() => {
                  const equal = Array(grid.rows).fill(1);
                  setRowHeightsInput(equal.join(','));
                  onGridChange({ ...grid, rowHeights: equal });
                }}
                className="ml-auto text-[10px] px-2 py-1 bg-gray-800 border border-gray-700 rounded hover:border-orange-500"
                title="Set all rows equal"
              >
                =
              </button>
            </div>
            <input
              type="text"
              value={rowHeightsInput}
              onChange={(e) => setRowHeightsInput(e.target.value)}
              onBlur={() => {
                const parts = rowHeightsInput.split(',').map((p) => parseFloat(p.trim())).filter((n) => !Number.isNaN(n) && n > 0);
                if (parts.length === grid.rows) {
                  onGridChange({ ...grid, rowHeights: parts });
                } else if (!rowHeightsInput.trim()) {
                  onGridChange({ ...grid, rowHeights: undefined });
                }
              }}
              placeholder="400,1100"
              className="w-full bg-gray-800 border border-gray-700 text-xs text-white rounded px-3 py-2 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Row 3: Offsets */}
        <div className="flex flex-wrap justify-center gap-3 w-full">
          <input
            type="number"
            value={offsetX}
            onChange={(e) => setOffsetX(parseInt(e.target.value) || 0)}
            placeholder="Offset left"
            className="w-32 bg-gray-800 border border-gray-700 text-xs text-white rounded px-3 py-2 focus:outline-none focus:border-orange-500"
            title="Shift all columns from the left edge"
          />
          <input
            type="number"
            value={offsetY}
            onChange={(e) => setOffsetY(parseInt(e.target.value) || 0)}
            placeholder="Offset top"
            className="w-32 bg-gray-800 border border-gray-700 text-xs text-white rounded px-3 py-2 focus:outline-none focus:border-orange-500"
            title="Shift all rows from the top edge"
          />
        </div>

        <div className="text-xs text-gray-400 font-mono">
          {grid.cols}x{grid.rows} Grid
        </div>
      </div>

      {/* Canvas Area with Enhanced Styling */}
       <div className="relative w-full aspect-video bg-gray-950 border border-gray-800 rounded-lg overflow-hidden flex items-center justify-center p-4 shadow-inner">
        <div className="relative shadow-2xl w-full h-full">
          {/* SVG Grid Renderer */}
          <svg 
            key={`grid-${grid.cols}-${grid.rows}-${grid.cells.length}`}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
             {/* Add a subtle background grid */}
            {colStarts.slice(1).map((xPos, i) => (
              <line
                key={`v-${i}`}
                x1={xPos}
                y1="0"
                x2={xPos}
                y2={svgHeight}
                stroke="#374151"
                strokeWidth="0.5"
                strokeDasharray="10 10"
              />
            ))}
            {rowStarts.slice(1).map((yPos, i) => (
              <line
                key={`h-${i}`}
                x1="0"
                y1={yPos}
                x2={svgWidth}
                y2={yPos}
                stroke="#374151"
                strokeWidth="0.5"
                strokeDasharray="10 10"
              />
            ))}

            {/* Render Cells */}
            {grid.cells.map((cell) => {
              const x = colStarts[cell.col];
              const y = rowStarts[cell.row];
              const w = colWidthsPx[cell.col];
              const h = rowHeightsPx[cell.row];

              return (
                <g 
                  key={cell.id}
                  onClick={() => handleCellClick(cell.id)}
                  onMouseEnter={() => setHoveredCell(cell.id)}
                  onMouseLeave={() => setHoveredCell(null)}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                >
                  {/* Cell Rect */}
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={getCellFill(cell.type, hoveredCell === cell.id)}
                    stroke={getCellStroke(cell.type)}
                    strokeWidth={hoveredCell === cell.id ? 4 : 1.5}
                    strokeDasharray={cell.type === 'empty' ? '10 10' : 'none'}
                    className="transition-all duration-150"
                  />

                  {/* Cell Type Label/Icon */}
                  <text
                    x={x + w / 2}
                    y={y + h / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={Math.min(w, h) * 0.16}
                    fontWeight="bold"
                    className="pointer-events-none select-none opacity-50"
                  >
                    {cell.type === 'sash'
                      ? cell.openingDirection === 'right'
                        ? 'SASH →'
                        : 'SASH ←'
                      : cell.type.toUpperCase()}
                  </text>

                  {/* Sash Triangle Indicator (hinge vs handle) */}
                  {cell.type === 'sash' && (
                    <path
                      d={`
                        M ${cell.openingDirection === 'right' ? x + w * 0.2 : x + w * 0.8} ${y + h * 0.2} 
                        L ${cell.openingDirection === 'right' ? x + w * 0.8 : x + w * 0.2} ${y + h / 2} 
                        L ${cell.openingDirection === 'right' ? x + w * 0.2 : x + w * 0.8} ${y + h * 0.8}
                      `}
                      fill="none"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeOpacity="0.6"
                    />
                  )}
                  
                  {/* Sliding Arrow Indicator (left/right panel) */}
                  {cell.type === 'sliding' && (
                    <g>
                      {(() => {
                        const isLeftPanel = cell.col < grid.cols / 2;
                        const dir = isLeftPanel ? -1 : 1;
                        const startX = x + w / 2;
                        const endX = startX + dir * (w * 0.25);
                        const midY = y + h / 2;
                        return (
                          <path
                            d={`
                              M ${startX} ${midY}
                              L ${endX} ${midY}
                              L ${endX - dir * w * 0.08} ${midY - h * 0.08}
                              M ${endX} ${midY}
                              L ${endX - dir * w * 0.08} ${midY + h * 0.08}
                            `}
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeOpacity="0.7"
                          />
                        );
                      })()}
                    </g>
                  )}
                  
                  {/* Cross for Panel */}
                  {cell.type === 'panel' && (
                    <path
                      d={`
                        M ${x} ${y} 
                        L ${x + w} ${y + h}
                        M ${x + w} ${y}
                        L ${x} ${y + h}
                      `}
                      fill="none"
                      stroke="white"
                      strokeWidth="1"
                      strokeOpacity="0.1"
                    />
                  )}
                </g>
              );
            })}

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
      </div>

      {/* Legend Overlay moved below */}
      <div className="flex flex-wrap gap-3 text-[10px] text-gray-300 bg-black/40 border border-gray-800 rounded p-2">
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
  );
};
