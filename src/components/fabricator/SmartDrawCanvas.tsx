import { getPatternById, getPatternsForSystem, patternToWindowGrid, type EgyptianPattern } from '@/lib/fabricator/presetUtils';
import { cn } from '@/lib/utils';
import { Label } from '@/shared/ui/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select';
import { Button } from '@/shared/ui/ui/button';
import { Toggle } from '@/shared/ui/ui/toggle';
import { GridCell, WindowGrid, ManualMullion } from '@/types/fabricator';
import { 
  ChevronDown, 
  ChevronUp, 
  Columns, 
  List, 
  Rows, 
  Minus, 
  Plus,
  Move,
  Square,
  Layers,
  X
} from 'lucide-react';
import React, { useEffect, useState, useCallback } from 'react';

interface SmartDrawProps {
  width: number;
  height: number;
  grid: WindowGrid;
  onGridChange: (grid: WindowGrid) => void;
  className?: string;
  availablePatterns?: EgyptianPattern[];
  selectedPatternId?: string | null;
  onPatternSelect?: (patternId: string | null) => void;
  systemPackId?: string | null;
}

type MullionMode = 'none' | 'frame-horizontal' | 'frame-vertical' | 'sash-horizontal' | 'sash-vertical';

export const SmartDrawCanvas: React.FC<SmartDrawProps> = ({
  width,
  height,
  grid,
  onGridChange,
  className,
  availablePatterns,
  selectedPatternId,
  onPatternSelect,
  systemPackId
}) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [colWidthsInput, setColWidthsInput] = useState('');
  const [rowHeightsInput, setRowHeightsInput] = useState('');
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [mullionMode, setMullionMode] = useState<MullionMode>('none');
  const [selectedSashForMullion, setSelectedSashForMullion] = useState<string | null>(null);
  const [mullionPositionInput, setMullionPositionInput] = useState('');
  const [showMullionInput, setShowMullionInput] = useState(false);

  const patterns = availablePatterns || (systemPackId ? getPatternsForSystem(systemPackId) : []);

  // Initialize manual mullions array if not present
  useEffect(() => {
    if (!grid.manualMullions) {
      onGridChange({ ...grid, manualMullions: [] });
    }
  }, [grid, onGridChange]);

  const handlePatternSelect = (patternId: string) => {
    if (!patternId || patternId === '') {
      onPatternSelect?.(null);
      return;
    }

    const pattern = getPatternById(patternId);
    if (!pattern) {
      console.warn(`Pattern not found: ${patternId}`);
      return;
    }

    const newGrid = patternToWindowGrid(pattern);
    
    if (pattern.gridSpec.colWidths) {
      setColWidthsInput(pattern.gridSpec.colWidths.join(','));
    }
    if (pattern.gridSpec.rowHeights) {
      setRowHeightsInput(pattern.gridSpec.rowHeights.join(','));
    }
    
    onGridChange(newGrid);
    onPatternSelect?.(patternId);
  };
  
  useEffect(() => {
    if (selectedPatternId && selectedPatternId !== '') {
      const pattern = getPatternById(selectedPatternId);
      if (pattern) {
        const newGrid = patternToWindowGrid(pattern);
        if (newGrid.rows !== grid.rows || newGrid.cols !== grid.cols || 
            JSON.stringify(newGrid.cells) !== JSON.stringify(grid.cells)) {
          if (pattern.gridSpec.colWidths) {
            setColWidthsInput(pattern.gridSpec.colWidths.join(','));
          }
          if (pattern.gridSpec.rowHeights) {
            setRowHeightsInput(pattern.gridSpec.rowHeights.join(','));
          }
          onGridChange(newGrid);
        }
      }
    }
  }, [selectedPatternId]);

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

  useEffect(() => {
    if (!grid || !grid.cells || grid.cells.length === 0) {
      onGridChange({
        rows: 1,
        cols: 1,
        cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }],
        manualMullions: []
      });
    }
  }, [grid, onGridChange]);

  const updateGridStructure = (newRows: number, newCols: number) => {
    const newCells: GridCell[] = [];
    
    for (let r = 0; r < newRows; r++) {
      for (let c = 0; c < newCols; c++) {
        const existing = grid.cells.find(cell => cell.row === r && cell.col === c);
        
        if (existing) {
          newCells.push(existing);
        } else {
          newCells.push({
            id: `${r}-${c}`,
            row: r,
            col: c,
            type: 'fixed'
          });
        }
      }
    }

    onGridChange({
      rows: newRows,
      cols: newCols,
      cells: newCells,
      manualMullions: grid.manualMullions || []
    });
  };

  const handleCellClick = (cellId: string) => {
    // If in sash mullion mode, select the sash first
    if (mullionMode.startsWith('sash-') && !selectedSashForMullion) {
      const cell = grid.cells.find(c => c.id === cellId);
      if (cell && (cell.type === 'sash' || cell.type === 'sliding')) {
        setSelectedSashForMullion(cellId);
        return;
      }
    }

    // Normal cell type cycling (only when not in mullion input mode)
    const newCells: GridCell[] = grid.cells.map(cell => {
      if (cell.id === cellId) {
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
        const validType = (nextKey === 'fixed' || nextKey === 'sliding' || nextKey === 'panel' || nextKey === 'empty') 
          ? nextKey 
          : 'fixed';
        return { ...cell, type: validType as 'fixed' | 'sash' | 'sliding' | 'empty' | 'panel', openingDirection: undefined };
      }
      return cell;
    });

    onGridChange({ ...grid, cells: newCells });
  };

  const handleAddMullionsFromInput = useCallback(() => {
    if (!mullionPositionInput.trim() || mullionMode === 'none') return;

    // Parse positions (comma-separated or newline-separated)
    const positions = mullionPositionInput
      .split(/[,\n]/)
      .map(p => parseFloat(p.trim()))
      .filter(p => !Number.isNaN(p) && p > 0);

    if (positions.length === 0) return;

    const existingMullions = grid.manualMullions || [];
    const newMullions: ManualMullion[] = positions.map((position, idx) => ({
      id: `mullion-${Date.now()}-${idx}-${Math.random()}`,
      type: mullionMode.includes('horizontal') ? 'horizontal' : 'vertical',
      level: mullionMode.startsWith('frame-') ? 'frame' : 'sash',
      position: position, // Position in mm from left (vertical) or top (horizontal)
      sashId: mullionMode.startsWith('sash-') ? selectedSashForMullion || undefined : undefined
    }));

    onGridChange({
      ...grid,
      manualMullions: [...existingMullions, ...newMullions]
    });

    // Reset after adding
    setMullionPositionInput('');
    setShowMullionInput(false);
    if (mullionMode.startsWith('sash-')) {
      setSelectedSashForMullion(null);
    }
    setMullionMode('none');
  }, [mullionMode, mullionPositionInput, grid, selectedSashForMullion, onGridChange]);

  const handleRemoveMullion = (mullionId: string) => {
    const existingMullions = grid.manualMullions || [];
    onGridChange({
      ...grid,
      manualMullions: existingMullions.filter(m => m.id !== mullionId)
    });
  };

  const svgWidth = 1000;
  const svgHeight = (height / width) * 1000;
  
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

  const getCellFill = (type: string, isHovered: boolean) => {
    const baseColor = {
      'fixed': 'rgba(59, 130, 246, 0.15)',
      'sash': 'rgba(34, 197, 94, 0.15)',
      'sliding': 'rgba(234, 179, 8, 0.15)',
      'panel': 'rgba(107, 114, 128, 0.2)',
      'empty': 'rgba(239, 68, 68, 0.08)',
    }[type] || 'transparent';

    return isHovered ? 'rgba(255, 255, 255, 0.15)' : baseColor;
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
    <div className={cn("flex flex-col gap-6 items-center", className)}>
      {/* Enhanced Controls Toolbar with Better Spacing */}
      <div className="flex flex-col gap-5 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 shadow-xl items-center w-full max-w-5xl">
        {/* Pattern Selector Section */}
        {patterns.length > 0 && (
          <div className="flex flex-col gap-2 w-full max-w-md">
            <Label className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <Layers className="h-4 w-4 text-orange-500" />
              Preset Pattern
            </Label>
            <Select 
              value={selectedPatternId || ''} 
              onValueChange={(value) => handlePatternSelect(value)}
            >
              <SelectTrigger className="w-full bg-gray-800/80 border-gray-600 text-sm text-white h-10 hover:border-orange-500/50 transition-colors">
                <SelectValue placeholder="Select pattern (or draw manually)..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="">None (Manual Drawing)</SelectItem>
                {patterns.map(pattern => (
                  <SelectItem key={pattern.id} value={pattern.id} className="text-sm">
                    {pattern.name} ({pattern.layout})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPatternId && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Pattern applied: Grid will update automatically
              </p>
            )}
          </div>
        )}
        
        {/* Grid Structure Controls - Enhanced Layout */}
        <div className="flex flex-wrap justify-center gap-4 w-full">
          <div className="flex flex-col items-center gap-2 bg-gray-800/60 rounded-lg px-4 py-3 border border-gray-700/50 min-w-[120px]" title="Vertical divisions (columns)">
            <div className="flex items-center gap-2 text-gray-300 mb-1">
              <Columns className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-medium">Columns</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => updateGridStructure(grid.rows, Math.max(1, grid.cols - 1))}
                className="p-1.5 hover:bg-gray-700/80 text-white transition-all rounded-md hover:scale-110 active:scale-95"
                aria-label="Decrease columns"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <span className="text-lg font-bold text-white min-w-[2ch] text-center">{grid.cols}</span>
              <button 
                onClick={() => updateGridStructure(grid.rows, Math.min(12, grid.cols + 1))}
                className="p-1.5 hover:bg-gray-700/80 text-white transition-all rounded-md hover:scale-110 active:scale-95"
                aria-label="Increase columns"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 bg-gray-800/60 rounded-lg px-4 py-3 border border-gray-700/50 min-w-[120px]" title="Horizontal divisions (rows)">
            <div className="flex items-center gap-2 text-gray-300 mb-1">
              <Rows className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-medium">Rows</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => updateGridStructure(Math.max(1, grid.rows - 1), grid.cols)}
                className="p-1.5 hover:bg-gray-700/80 text-white transition-all rounded-md hover:scale-110 active:scale-95"
                aria-label="Decrease rows"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <span className="text-lg font-bold text-white min-w-[2ch] text-center">{grid.rows}</span>
              <button 
                onClick={() => updateGridStructure(Math.min(8, grid.rows + 1), grid.cols)}
                className="p-1.5 hover:bg-gray-700/80 text-white transition-all rounded-md hover:scale-110 active:scale-95"
                aria-label="Increase rows"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mullion Drawing Tools - Enhanced with Position Input */}
        <div className="flex flex-col gap-3 w-full border-t border-gray-700/50 pt-4">
          <Label className="text-sm font-medium text-gray-200 flex items-center gap-2">
            <Square className="h-4 w-4 text-orange-500" />
            Mullion Tools
          </Label>
          <div className="flex flex-wrap gap-2">
            <Toggle
              pressed={mullionMode === 'frame-horizontal'}
              onPressedChange={(pressed) => {
                setMullionMode(pressed ? 'frame-horizontal' : 'none');
                setSelectedSashForMullion(null);
                setShowMullionInput(pressed);
                if (!pressed) setMullionPositionInput('');
              }}
              className="data-[state=on]:bg-orange-600 data-[state=on]:text-white"
              title="Add horizontal mullion to frame (structural)"
            >
              <Minus className="h-3.5 w-3.5 mr-1.5" />
              Frame H
            </Toggle>
            <Toggle
              pressed={mullionMode === 'frame-vertical'}
              onPressedChange={(pressed) => {
                setMullionMode(pressed ? 'frame-vertical' : 'none');
                setSelectedSashForMullion(null);
                setShowMullionInput(pressed);
                if (!pressed) setMullionPositionInput('');
              }}
              className="data-[state=on]:bg-orange-600 data-[state=on]:text-white"
              title="Add vertical mullion to frame (structural)"
            >
              <Minus className="h-3.5 w-3.5 mr-1.5 rotate-90" />
              Frame V
            </Toggle>
            <Toggle
              pressed={mullionMode === 'sash-horizontal'}
              onPressedChange={(pressed) => {
                setMullionMode(pressed ? 'sash-horizontal' : 'none');
                setSelectedSashForMullion(null);
                setShowMullionInput(pressed);
                if (!pressed) setMullionPositionInput('');
              }}
              className="data-[state=on]:bg-orange-600 data-[state=on]:text-white"
              title="Add horizontal mullion inside sash"
            >
              <Minus className="h-3.5 w-3.5 mr-1.5" />
              Sash H
            </Toggle>
            <Toggle
              pressed={mullionMode === 'sash-vertical'}
              onPressedChange={(pressed) => {
                setMullionMode(pressed ? 'sash-vertical' : 'none');
                setSelectedSashForMullion(null);
                setShowMullionInput(pressed);
                if (!pressed) setMullionPositionInput('');
              }}
              className="data-[state=on]:bg-orange-600 data-[state=on]:text-white"
              title="Add vertical mullion inside sash"
            >
              <Minus className="h-3.5 w-3.5 mr-1.5 rotate-90" />
              Sash V
            </Toggle>
          </div>

          {/* Position Input Box - Shows when mullion mode is active */}
          {showMullionInput && (
            <div className="flex flex-col gap-2 bg-gray-800/60 rounded-lg p-4 border border-orange-500/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-200 flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-orange-500" />
                  {mullionMode.includes('horizontal') ? 'Horizontal' : 'Vertical'} Mullion Position(s) (mm)
                </Label>
                {mullionMode.startsWith('sash-') && (
                  <span className="text-xs text-orange-400">
                    Select sash first, then enter positions
                  </span>
                )}
              </div>
              <textarea
                value={mullionPositionInput}
                onChange={(e) => setMullionPositionInput(e.target.value)}
                placeholder={mullionMode.includes('horizontal') 
                  ? "Enter positions from top (mm), e.g.: 400, 800, 1200" 
                  : "Enter positions from left (mm), e.g.: 600, 1200, 1800"}
                className="w-full bg-gray-900/80 border border-gray-600 text-sm text-white rounded-lg px-4 py-2.5 min-h-[80px] focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all font-mono"
                rows={3}
              />
                <div className="flex items-center gap-2">
                <Button
                  onClick={handleAddMullionsFromInput}
                  disabled={!mullionPositionInput.trim() || (mullionMode.startsWith('sash-') && !selectedSashForMullion)}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Mullion{(mullionPositionInput.split(/[,\n]/).filter(p => p.trim()).length > 1) ? 's' : ''}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMullionMode('none');
                    setSelectedSashForMullion(null);
                    setMullionPositionInput('');
                    setShowMullionInput(false);
                  }}
                  className="text-xs h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
              <p className="text-[10px] text-gray-400">
                {mullionMode.includes('horizontal') 
                  ? `Enter position(s) from top edge in mm (0 to ${height}mm). Separate multiple positions with commas or new lines.`
                  : `Enter position(s) from left edge in mm (0 to ${width}mm). Separate multiple positions with commas or new lines.`}
              </p>
            </div>
          )}

          {/* Sash Selection for Sash-level Mullions */}
          {mullionMode.startsWith('sash-') && !selectedSashForMullion && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <p className="text-xs text-blue-300 flex items-center gap-2">
                <Move className="h-3.5 w-3.5" />
                Click on a sash cell below to select it, then enter mullion positions
              </p>
            </div>
          )}
          {mullionMode.startsWith('sash-') && selectedSashForMullion && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
              <p className="text-xs text-green-300 flex items-center gap-2">
                <Square className="h-3 w-3" />
                Selected: {grid.cells.find(c => c.id === selectedSashForMullion)?.id || 'Sash'}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSashForMullion(null)}
                  className="text-xs h-6 ml-auto"
                >
                  Change
                </Button>
              </p>
            </div>
          )}
        </div>

        {/* Proportions Input Section - Enhanced */}
        <div className="flex flex-wrap justify-center gap-4 w-full border-t border-gray-700/50 pt-4">
          <div className="flex flex-col gap-2 flex-1 min-w-[240px] max-w-[280px]">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <List className="h-3.5 w-3.5 text-orange-500" />
                Column Widths
              </Label>
              <button
                onClick={() => {
                  const equal = Array(grid.cols).fill(1);
                  setColWidthsInput(equal.join(','));
                  onGridChange({ ...grid, colWidths: equal });
                }}
                className="text-[10px] px-2 py-1 bg-gray-700/60 border border-gray-600 rounded hover:border-orange-500/50 hover:bg-gray-700 transition-colors"
                title="Set all columns equal"
              >
                Reset
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
              className="w-full bg-gray-800/80 border border-gray-600 text-sm text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all"
            />
          </div>

          <div className="flex flex-col gap-2 flex-1 min-w-[240px] max-w-[280px]">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <List className="h-3.5 w-3.5 text-orange-500" />
                Row Heights
              </Label>
              <button
                onClick={() => {
                  const equal = Array(grid.rows).fill(1);
                  setRowHeightsInput(equal.join(','));
                  onGridChange({ ...grid, rowHeights: equal });
                }}
                className="text-[10px] px-2 py-1 bg-gray-700/60 border border-gray-600 rounded hover:border-orange-500/50 hover:bg-gray-700 transition-colors"
                title="Set all rows equal"
              >
                Reset
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
              className="w-full bg-gray-800/80 border border-gray-600 text-sm text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all"
            />
          </div>
        </div>

        {/* Grid Info */}
        <div className="text-xs text-gray-400 font-mono bg-gray-800/40 px-3 py-1.5 rounded border border-gray-700/50">
          {grid.cols}×{grid.rows} Grid
          {grid.manualMullions && grid.manualMullions.length > 0 && (
            <span className="ml-2 text-orange-400">
              • {grid.manualMullions.length} Mullion{grid.manualMullions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Enhanced Canvas Area */}
      <div className="relative w-full aspect-video bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border-2 border-gray-700/50 rounded-xl overflow-hidden flex items-center justify-center p-6 shadow-2xl">
        <div className="relative shadow-2xl w-full h-full">
          <svg 
            key={`grid-${grid.cols}-${grid.rows}-${grid.cells.length}`}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Background Grid Lines */}
            {colStarts.slice(1).map((xPos, i) => (
              <line
                key={`v-${i}`}
                x1={xPos}
                y1="0"
                x2={xPos}
                y2={svgHeight}
                stroke="#374151"
                strokeWidth="0.5"
                strokeDasharray="8 8"
                opacity="0.4"
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
                strokeDasharray="8 8"
                opacity="0.4"
              />
            ))}

            {/* Render Manual Mullions */}
            {grid.manualMullions?.map((mullion) => {
              if (mullion.level === 'frame') {
                if (mullion.type === 'horizontal') {
                  const y = (mullion.position / height) * svgHeight;
                  return (
                    <g 
                      key={mullion.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <line
                        x1="0"
                        y1={y}
                        x2={svgWidth}
                        y2={y}
                        stroke="#f97316"
                        strokeWidth="4"
                        strokeDasharray="none"
                        opacity="0.9"
                        className="pointer-events-none"
                      />
                      {/* Larger, more visible delete button */}
                      <g
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleRemoveMullion(mullion.id);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={svgWidth - 30}
                          cy={y}
                          r="12"
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="2"
                          opacity="0.95"
                          className="hover:fill-red-600 hover:scale-110 transition-transform"
                        />
                        <text
                          x={svgWidth - 30}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="14"
                          fontWeight="bold"
                          pointerEvents="none"
                        >
                          ×
                        </text>
                      </g>
                      {/* Also add delete button on the left side */}
                      <g
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleRemoveMullion(mullion.id);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={30}
                          cy={y}
                          r="12"
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="2"
                          opacity="0.95"
                          className="hover:fill-red-600 hover:scale-110 transition-transform"
                        />
                        <text
                          x={30}
                          y={y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="14"
                          fontWeight="bold"
                          pointerEvents="none"
                        >
                          ×
                        </text>
                      </g>
                    </g>
                  );
                } else {
                  const x = (mullion.position / width) * svgWidth;
                  return (
                    <g 
                      key={mullion.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <line
                        x1={x}
                        y1="0"
                        x2={x}
                        y2={svgHeight}
                        stroke="#f97316"
                        strokeWidth="4"
                        strokeDasharray="none"
                        opacity="0.9"
                        className="pointer-events-none"
                      />
                      {/* Larger, more visible delete button at top */}
                      <g
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleRemoveMullion(mullion.id);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={x}
                          cy={30}
                          r="12"
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="2"
                          opacity="0.95"
                          className="hover:fill-red-600 hover:scale-110 transition-transform"
                        />
                        <text
                          x={x}
                          y={30}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="14"
                          fontWeight="bold"
                          pointerEvents="none"
                        >
                          ×
                        </text>
                      </g>
                      {/* Also add delete button at bottom */}
                      <g
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleRemoveMullion(mullion.id);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={x}
                          cy={svgHeight - 30}
                          r="12"
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth="2"
                          opacity="0.95"
                          className="hover:fill-red-600 hover:scale-110 transition-transform"
                        />
                        <text
                          x={x}
                          y={svgHeight - 30}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="14"
                          fontWeight="bold"
                          pointerEvents="none"
                        >
                          ×
                        </text>
                      </g>
                    </g>
                  );
                }
              }
              return null;
            })}

            {/* Render Cells */}
            {grid.cells.map((cell) => {
              const x = colStarts[cell.col];
              const y = rowStarts[cell.row];
              const w = colWidthsPx[cell.col];
              const h = rowHeightsPx[cell.row];
              const isSelectedForMullion = selectedSashForMullion === cell.id;
              const isSash = cell.type === 'sash' || cell.type === 'sliding';

              return (
                <g 
                  key={cell.id}
                  onClick={(e) => {
                    // Only handle cell click if not in mullion mode or if clicking on mullion delete button
                    if (mullionMode === 'none') {
                      handleCellClick(cell.id);
                    }
                  }}
                  onMouseEnter={() => setHoveredCell(cell.id)}
                  onMouseLeave={() => setHoveredCell(null)}
                  className={mullionMode === 'none' ? "cursor-pointer transition-opacity hover:opacity-90" : "cursor-crosshair"}
                >
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={getCellFill(cell.type, hoveredCell === cell.id || isSelectedForMullion)}
                    stroke={isSelectedForMullion ? '#f97316' : getCellStroke(cell.type)}
                    strokeWidth={isSelectedForMullion ? 3 : (hoveredCell === cell.id ? 3 : 2)}
                    strokeDasharray={cell.type === 'empty' ? '8 8' : 'none'}
                    className="transition-all duration-200"
                  />

                  <text
                    x={x + w / 2}
                    y={y + h / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={Math.min(w, h) * 0.14}
                    fontWeight="600"
                    className="pointer-events-none select-none opacity-70"
                  >
                    {cell.type === 'sash'
                      ? cell.openingDirection === 'right'
                        ? 'SASH →'
                        : 'SASH ←'
                      : cell.type.toUpperCase()}
                  </text>

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
                      strokeOpacity="0.2"
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
              stroke="#6b7280" 
              strokeWidth="5"
              rx="2"
            />
          </svg>
        </div>
      </div>

      {/* Enhanced Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-300 bg-gray-900/60 border border-gray-700/50 rounded-lg p-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500/50 border border-blue-500 rounded" /> 
          <span className="font-medium">Fixed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500/50 border border-green-500 rounded" /> 
          <span className="font-medium">Sash</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500/50 border border-yellow-500 rounded" /> 
          <span className="font-medium">Sliding</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-500/50 border border-gray-500 rounded" /> 
          <span className="font-medium">Panel</span>
        </div>
        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-700">
          <div className="w-3 h-3 bg-orange-500 border border-orange-400 rounded" /> 
          <span className="font-medium">Mullion</span>
        </div>
      </div>
    </div>
  );
};
