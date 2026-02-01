import { useTouchGestures } from '@/hooks/useTouchGestures';
import { getPatternById, getPatternsForSystem, patternToWindowGrid, type EgyptianPattern } from '@/lib/fabricator/presetUtils';
import { presetMatcher, type PatternMatch } from '@/lib/ml/PresetMatcher';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/ui/ui/button';
import { Label } from '@/shared/ui/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/ui/select';
import { Toggle } from '@/shared/ui/ui/toggle';
import { GridCell, ManualMullion, WindowGrid } from '@/types/fabricator';
import {
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Columns,
  Copy,
  FlipHorizontal,
  FlipVertical,
  Layers,
  List,
  Minus,
  Move,
  Plus,
  Redo,
  Rows,
  Ruler,
  Sparkles,
  Square,
  Undo,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MullionDeleteButton } from './SmartDrawCanvas/MullionDeleteButton';
import { GridMeasurementOverlay } from './SmartDrawCanvas/components';
import { useGridMultiSelect } from './SmartDrawCanvas/hooks';
import {
  GridUndoRedoManager,
  copyCellsToClipboard,
  getCellsByIds,
  getGridClipboardData,
  hasGridClipboardData,
  mirrorGridHorizontally,
  mirrorGridVertically,
  pasteCellsIntoGrid
} from './SmartDrawCanvas/utils';

interface TouchGestureCallbacks {
  onPinchZoom?: (data: { scale: number; center: { x: number; y: number }; velocity: number }) => void;
  onTwoFingerPan?: (data: { delta: { x: number; y: number }; velocity: { x: number; y: number } }) => void;
  onTap?: (data: { point: { x: number; y: number }; double: boolean }) => void;
  onLongPress?: (data: { point: { x: number; y: number } }) => void;
  onGestureEnd?: () => void;
}

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
  showToolbar?: boolean; // New: Allow hiding toolbar for integration with QuickAccessToolbar
  onUndoRef?: React.MutableRefObject<(() => void) | null>; // Expose undo handler
  onRedoRef?: React.MutableRefObject<(() => void) | null>; // Expose redo handler
  canUndoRef?: React.MutableRefObject<boolean>; // Expose canUndo state
  canRedoRef?: React.MutableRefObject<boolean>; // Expose canRedo state
  // Phase 3: Hardware integration (optional)
  onCellContextMenu?: (cellId: string, position: { x: number; y: number }, event: React.MouseEvent) => void; // Right-click context menu handler
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
  systemPackId,
  showToolbar = true,
  onUndoRef,
  onRedoRef,
  canUndoRef,
  canRedoRef,
  onCellContextMenu, // Phase 3: Hardware integration
}) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [colWidthsInput, setColWidthsInput] = useState('');
  const [rowHeightsInput, setRowHeightsInput] = useState('');
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  // Phase 9: Accessibility State
  const [focusedCellId, setFocusedCellId] = useState<string | null>(null);
  const canvasRef = useRef<SVGSVGElement>(null);

  const [mullionMode, setMullionMode] = useState<MullionMode>('none');
  const [selectedSashForMullion, setSelectedSashForMullion] = useState<string | null>(null);
  const [mullionPositionInput, setMullionPositionInput] = useState('');
  const [showMullionInput, setShowMullionInput] = useState(false);
  const [suggestedPatterns, setSuggestedPatterns] = useState<PatternMatch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showMeasurements, setShowMeasurements] = useState(true);

  // Phase 2: Multi-select functionality
  const {
    selectedCellIds,
    toggleCellSelection,
    selectCell,
    clearSelection,
    isCellSelected,
  } = useGridMultiSelect();

  // Phase 2: Undo/Redo manager (direct usage for controlled component)
  const undoRedoManagerRef = useRef<GridUndoRedoManager>(new GridUndoRedoManager());
  const isUndoRedoOperationRef = useRef(false);
  const isInitializedRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initialize undo/redo manager on mount
  useEffect(() => {
    if (!isInitializedRef.current) {
      undoRedoManagerRef.current.initialize(grid);
      isInitializedRef.current = true;
      setCanUndo(false);
      setCanRedo(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally only run on mount - initialize with initial grid value only

  // Store latest calculated values in refs for gesture callbacks
  const colWidthsPxRef = useRef<number[]>([]);
  const rowHeightsPxRef = useRef<number[]>([]);
  const gridRef = useRef(grid);
  const mullionModeRef = useRef(mullionMode);
  const zoomLevelRef = useRef(zoomLevel);
  const offsetXRef = useRef(offsetX);
  const offsetYRef = useRef(offsetY);

  // Update refs when values change
  useEffect(() => {
    gridRef.current = grid;
    mullionModeRef.current = mullionMode;
    zoomLevelRef.current = zoomLevel;
    offsetXRef.current = offsetX;
    offsetYRef.current = offsetY;
  }, [grid, mullionMode, zoomLevel, offsetX, offsetY]);

  // Touch gesture configuration
  // const _touchConfig: TouchGestureConfig = { ... }; // Removed unused config

  // Update canUndo/canRedo when grid changes (for external updates)
  useEffect(() => {
    if (!isUndoRedoOperationRef.current && isInitializedRef.current) {
      setCanUndo(undoRedoManagerRef.current.canUndo());
      setCanRedo(undoRedoManagerRef.current.canRedo());
    }
    isUndoRedoOperationRef.current = false;
  }, [grid]);

  // Phase 2: Wrapper function to handle grid changes with undo/redo tracking
  const handleGridChangeWithHistory = useCallback((newGrid: WindowGrid, skipHistory = false) => {
    if (!skipHistory && !isUndoRedoOperationRef.current) {
      // Push current grid to history before changing
      undoRedoManagerRef.current.push(grid);
      setCanUndo(undoRedoManagerRef.current.canUndo());
      setCanRedo(false); // Clear redo when new action is taken
    }
    onGridChange(newGrid);
  }, [grid, onGridChange]);

  // Phase 2: Undo handler
  const handleUndo = useCallback(() => {
    const previousGrid = undoRedoManagerRef.current.undo();
    if (previousGrid) {
      isUndoRedoOperationRef.current = true;
      onGridChange(previousGrid);
      setCanUndo(undoRedoManagerRef.current.canUndo());
      setCanRedo(undoRedoManagerRef.current.canRedo());
    }
  }, [onGridChange]);

  // Phase 2: Redo handler
  const handleRedo = useCallback(() => {
    const nextGrid = undoRedoManagerRef.current.redo();
    if (nextGrid) {
      isUndoRedoOperationRef.current = true;
      onGridChange(nextGrid);
      setCanUndo(undoRedoManagerRef.current.canUndo());
      setCanRedo(undoRedoManagerRef.current.canRedo());
    }
  }, [onGridChange]);

  // Expose handlers for QuickAccessToolbar integration
  useEffect(() => {
    if (onUndoRef) onUndoRef.current = handleUndo;
    if (onRedoRef) onRedoRef.current = handleRedo;
    if (canUndoRef) canUndoRef.current = canUndo;
    if (canRedoRef) canRedoRef.current = canRedo;
  }, [handleUndo, handleRedo, canUndo, canRedo, onUndoRef, onRedoRef, canUndoRef, canRedoRef]);

  const patterns = availablePatterns || (systemPackId ? getPatternsForSystem(systemPackId) : []);

  // Calculate preset suggestions when grid changes (debounced)
  useEffect(() => {
    // Only suggest if no pattern is currently selected and grid has cells
    if (!selectedPatternId && grid.cells && Array.isArray(grid.cells) && grid.cells.length > 0) {
      const suggestions = presetMatcher.suggestPresets(
        grid,
        { width, height },
        systemPackId || undefined
      );
      // Only show suggestions with confidence > 50%
      const filteredSuggestions = suggestions.filter(s => s.confidence > 50);
      setSuggestedPatterns(filteredSuggestions);
    } else {
      setSuggestedPatterns([]);
    }
  }, [grid, width, height, systemPackId, selectedPatternId]);

  // Initialize manual mullions array if not present
  useEffect(() => {
    if (!grid.manualMullions) {
      onGridChange({ ...grid, manualMullions: [] });
    }
  }, [grid, onGridChange]);

  const handlePatternSelect = useCallback((patternId: string) => {
    if (!patternId || patternId === '') {
      onPatternSelect?.(null);
      return;
    }

    const pattern = getPatternById(patternId);
    if (!pattern) {
      console.warn(`Pattern not found: ${patternId}`);
      return;
    }

    // Log user confirmation for ML training
    if (suggestedPatterns.length > 0) {
      const suggestedPattern = suggestedPatterns[0]?.pattern;
      if (suggestedPattern) {
        presetMatcher.logUserConfirmation(
          grid,
          suggestedPattern,
          pattern,
          { width, height }
        );
      }
    }

    const newGrid = patternToWindowGrid(pattern);

    if (pattern.gridSpec.colWidths) {
      setColWidthsInput(pattern.gridSpec.colWidths.join(','));
    }
    if (pattern.gridSpec.rowHeights) {
      setRowHeightsInput(pattern.gridSpec.rowHeights.join(','));
    }

    handleGridChangeWithHistory(newGrid);
    onPatternSelect?.(patternId);
  }, [grid, suggestedPatterns, width, height, handleGridChangeWithHistory, onPatternSelect]);

  const handleSuggestionClick = (pattern: EgyptianPattern) => {
    handlePatternSelect(pattern.id);
    setShowSuggestions(false);
  };

  useEffect(() => {
    if (selectedPatternId && selectedPatternId !== '') {
      const pattern = getPatternById(selectedPatternId);
      if (pattern) {
        const newGrid = patternToWindowGrid(pattern);
        const currentCells = grid.cells && Array.isArray(grid.cells) ? grid.cells : [];
        if (newGrid.rows !== grid.rows || newGrid.cols !== grid.cols ||
          JSON.stringify(newGrid.cells) !== JSON.stringify(currentCells)) {
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
  }, [selectedPatternId, grid.cells, grid.cols, grid.rows, onGridChange]);

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

  const updateGridStructure = useCallback((newRows: number, newCols: number) => {
    const newCells: GridCell[] = [];
    const cells = grid.cells && Array.isArray(grid.cells) ? grid.cells : [];

    for (let r = 0; r < newRows; r++) {
      for (let c = 0; c < newCols; c++) {
        const existing = cells.find(cell => cell.row === r && cell.col === c);

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

    handleGridChangeWithHistory({
      rows: newRows,
      cols: newCols,
      cells: newCells,
      manualMullions: grid.manualMullions || []
    });
  }, [grid, handleGridChangeWithHistory]);

  const handleCellClick = useCallback((cellId: string, event?: React.MouseEvent) => {
    // If in sash mullion mode, select the sash first
    if (mullionMode.startsWith('sash-') && !selectedSashForMullion) {
      const cell = grid.cells && Array.isArray(grid.cells) ? grid.cells.find(c => c.id === cellId) : undefined;
      if (cell && (cell.type === 'sash' || cell.type === 'sliding')) {
        setSelectedSashForMullion(cellId);
        return;
      }
    }

    // Phase 2: Multi-select support (Ctrl/Cmd for toggle, Shift for range)
    if (event?.ctrlKey || event?.metaKey) {
      toggleCellSelection(cellId, event.nativeEvent);
      return;
    }

    if (event?.shiftKey && selectedCellIds.size > 0) {
      toggleCellSelection(cellId, event.nativeEvent);
      return;
    }

    // Phase 2: Single selection (clear multi-select)
    if (!event?.ctrlKey && !event?.metaKey && !event?.shiftKey) {
      clearSelection();
    }

    // Normal cell type cycling (only when not in mullion input mode)
    if (!grid.cells || !Array.isArray(grid.cells)) {
      return;
    }
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

    handleGridChangeWithHistory({ ...grid, cells: newCells });
    selectCell(cellId);
  }, [grid, handleGridChangeWithHistory, selectCell, clearSelection, toggleCellSelection, selectedCellIds, mullionMode, selectedSashForMullion]);

  // ✅ PERFORMANCE FIX: Stabilize gesture callbacks - use refs to avoid recreation
  // Only recreate when absolutely necessary (selectCell reference changes)
  const gestureCallbacks: TouchGestureCallbacks = useMemo(() => ({
    onPinchZoom: (data) => {
      // Update zoom level based on scale
      setZoomLevel(prev => {
        const newZoom = Math.max(0.5, Math.min(3, prev * data.scale));
        zoomLevelRef.current = newZoom;
        return newZoom;
      });
    },
    onTwoFingerPan: (data) => {
      // Update pan offset
      setOffsetX(prev => {
        const newX = prev + data.delta.x / zoomLevelRef.current;
        offsetXRef.current = newX;
        return newX;
      });
      setOffsetY(prev => {
        const newY = prev + data.delta.y / zoomLevelRef.current;
        offsetYRef.current = newY;
        return newY;
      });
    },
    onTap: (data) => {
      if (mullionModeRef.current === 'none' && canvasRef.current) {
        const svg = canvasRef.current;
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;

        // Calculate SVG coordinates
        const x = ((data.point.x - rect.left) / rect.width) * viewBox.width / zoomLevelRef.current + offsetXRef.current;
        const y = ((data.point.y - rect.top) / rect.height) * viewBox.height / zoomLevelRef.current + offsetYRef.current;

        // Find cell at point
        let currentX = 0;
        let currentY = 0;
        const colWidths = colWidthsPxRef.current;
        const rowHeights = rowHeightsPxRef.current;

        for (let col = 0; col < gridRef.current.cols; col++) {
          const colWidth = colWidths[col] || 0;
          if (x >= currentX && x < currentX + colWidth) {
            for (let row = 0; row < gridRef.current.rows; row++) {
              const rowHeight = rowHeights[row] || 0;
              if (y >= currentY && y < currentY + rowHeight) {
                const cell = gridRef.current.cells?.find(c => c.row === row && c.col === col);
                if (cell) {
                  if (data.double) {
                    handleCellClick(cell.id, {} as React.MouseEvent);
                  } else {
                    selectCell(cell.id);
                  }
                }
                return;
              }
              currentY += rowHeight;
            }
            break;
          }
          currentX += colWidth;
        }
      }
    },
    onLongPress: (data) => {
      if (onCellContextMenu && mullionModeRef.current === 'none' && canvasRef.current) {
        const svg = canvasRef.current;
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;

        // Calculate SVG coordinates
        const x = ((data.point.x - rect.left) / rect.width) * viewBox.width / zoomLevelRef.current + offsetXRef.current;
        const y = ((data.point.y - rect.top) / rect.height) * viewBox.height / zoomLevelRef.current + offsetYRef.current;

        // Find cell at point
        let currentX = 0;
        let currentY = 0;
        const colWidths = colWidthsPxRef.current;
        const rowHeights = rowHeightsPxRef.current;

        for (let col = 0; col < gridRef.current.cols; col++) {
          const colWidth = colWidths[col] || 0;
          if (x >= currentX && x < currentX + colWidth) {
            for (let row = 0; row < gridRef.current.rows; row++) {
              const rowHeight = rowHeights[row] || 0;
              if (y >= currentY && y < currentY + rowHeight) {
                const cell = gridRef.current.cells?.find(c => c.row === row && c.col === col);
                if (cell) {
                  onCellContextMenu(cell.id, { x: data.point.x, y: data.point.y }, {} as React.MouseEvent);
                }
                return;
              }
              currentY += rowHeight;
            }
            break;
          }
          currentX += colWidth;
        }
      }
    },
  }), [selectCell, onCellContextMenu, handleCellClick]); // Only recreate when these stable references change

  // Initialize touch gestures - attach to canvas container div
  const containerRef = useTouchGestures<HTMLDivElement>({
    onTap: (e) => gestureCallbacks.onTap?.({ point: e.center, double: false }), // We handle double tap separately if needed? My manager emits doubleTap.
    onDoubleTap: (e) => gestureCallbacks.onTap?.({ point: e.center, double: true }),
    onLongPress: (e) => gestureCallbacks.onLongPress?.({ point: e.center }),
    onPinch: (e) => {
      // Handle Zoom
      if (e.scale !== 1) {
        gestureCallbacks.onPinchZoom?.({
          scale: e.scale || 1,
          center: e.center,
          velocity: 0
        });
      }
      // Handle Pan (2-finger)
      if (e.deltaX !== 0 || e.deltaY !== 0) {
        gestureCallbacks.onTwoFingerPan?.({
          delta: { x: e.deltaX || 0, y: e.deltaY || 0 },
          velocity: { x: 0, y: 0 }
        });
      }
    },
    // We ignore single-finger pan as it might be for drawing/selecting? 
    // Or we can map it if we want. SmartDraw logic seemed to use 2-finger for pan.
  });

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

    handleGridChangeWithHistory({
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
  }, [mullionMode, mullionPositionInput, grid, selectedSashForMullion, handleGridChangeWithHistory]);

  const handleRemoveMullion = useCallback((mullionId: string) => {
    const existingMullions = grid.manualMullions || [];
    handleGridChangeWithHistory({
      ...grid,
      manualMullions: existingMullions.filter(m => m.id !== mullionId)
    });
  }, [grid, handleGridChangeWithHistory]);

  // Phase 2: Copy/Paste handlers
  const handleCopy = useCallback(() => {
    if (selectedCellIds.size === 0) return;
    const selectedCells = getCellsByIds(grid, Array.from(selectedCellIds));
    copyCellsToClipboard(selectedCells);
  }, [grid, selectedCellIds]);

  const handlePaste = useCallback(() => {
    const clipboardData = getGridClipboardData();
    if (!clipboardData) return;

    // Paste at center of grid (or first selected cell if available)
    const targetRow = grid.rows > 0 ? Math.floor(grid.rows / 2) : 0;
    const targetCol = grid.cols > 0 ? Math.floor(grid.cols / 2) : 0;

    const newGrid = pasteCellsIntoGrid(clipboardData, targetRow, targetCol, grid);
    if (newGrid) {
      handleGridChangeWithHistory(newGrid);
      clearSelection();
    }
  }, [grid, handleGridChangeWithHistory, clearSelection]);

  // Phase 9: Keyboard Navigation Handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!grid.cells || grid.cells.length === 0) return;

    // Prevent scrolling for arrow keys if focused
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    // Default to first cell if nothing focused
    if (!focusedCellId) {
      setFocusedCellId('0-0');
      return;
    }

    const [currentRow, currentCol] = focusedCellId.split('-').map(Number);
    let nextRow = currentRow;
    let nextCol = currentCol;

    switch (e.key) {
      case 'ArrowUp':
        nextRow = Math.max(0, currentRow - 1);
        break;
      case 'ArrowDown':
        nextRow = Math.min(grid.rows - 1, currentRow + 1);
        break;
      case 'ArrowLeft':
        nextCol = Math.max(0, currentCol - 1);
        break;
      case 'ArrowRight':
        nextCol = Math.min(grid.cols - 1, currentCol + 1);
        break;
      case 'Enter':
      case ' ':
        // Toggle selection
        handleCellClick(`${currentRow}-${currentCol}`, { ctrlKey: true } as any);
        return;
      case 'Delete':
      case 'Backspace':
        // Clear cell content if selected
        if (selectedCellIds.has(focusedCellId)) {
          const newCells = grid.cells.map(c =>
            c.id === focusedCellId ? { ...c, type: 'empty' as const } : c
          );
          handleGridChangeWithHistory({ ...grid, cells: newCells });
        }
        return;
      case 'Escape':
        setFocusedCellId(null);
        // containerRef is from useTouchGestures, it's a ref object, so current exists
        (containerRef as any).current?.blur();
        return;
      default:
        return;
    }

    const nextId = `${nextRow}-${nextCol}`;
    setFocusedCellId(nextId);
  }, [grid, focusedCellId, handleCellClick, selectedCellIds, handleGridChangeWithHistory, containerRef]);

  // Phase 2: Grid symmetry handlers
  const handleMirrorHorizontal = useCallback(() => {
    const mirrored = mirrorGridHorizontally(grid);
    handleGridChangeWithHistory(mirrored);
  }, [grid, handleGridChangeWithHistory]);

  const handleMirrorVertical = useCallback(() => {
    const mirrored = mirrorGridVertically(grid);
    handleGridChangeWithHistory(mirrored);
  }, [grid, handleGridChangeWithHistory]);

  // Phase 2: Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl/Cmd + Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl/Cmd + C: Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
        return;
      }

      // Ctrl/Cmd + V: Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCopy, handlePaste]);

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

  // Update refs with calculated values
  useEffect(() => {
    colWidthsPxRef.current = colWidthsPx;
    rowHeightsPxRef.current = rowHeightsPx;
  }, [colWidthsPx, rowHeightsPx]);

  // ✅ PERFORMANCE FIX: Wrap in useCallback to prevent recreation on every render
  const getCellFill = useCallback((type: string, isHovered: boolean) => {
    const baseColor = {
      'fixed': 'rgba(59, 130, 246, 0.15)',
      'sash': 'rgba(34, 197, 94, 0.15)',
      'sliding': 'rgba(234, 179, 8, 0.15)',
      'panel': 'rgba(107, 114, 128, 0.2)',
      'empty': 'rgba(239, 68, 68, 0.08)',
    }[type] || 'transparent';

    return isHovered ? 'rgba(255, 255, 255, 0.15)' : baseColor;
  }, []);

  // ✅ PERFORMANCE FIX: Wrap in useCallback to prevent recreation on every render
  const getCellStroke = useCallback((type: string) => {
    return {
      'fixed': '#3b82f6',
      'sash': '#22c55e',
      'sliding': '#eab308',
      'panel': '#6b7280',
      'empty': '#ef4444',
    }[type] || '#4b5563';
  }, []);

  // ✅ CRITICAL PERFORMANCE FIX: Stable mouse event handlers to eliminate inline function creation
  // This prevents creating new function instances for EVERY cell on EVERY render
  const handleMouseEnter = useCallback((cellId: string) => {
    setHoveredCell(cellId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  return (
    <div className={cn("flex flex-col", showToolbar ? "gap-6 items-center" : "h-full", className)}>
      {/* Enhanced Controls Toolbar with Better Spacing - Compact when shown */}
      {showToolbar && (
        <div className="flex flex-col gap-3 card-glass-dark p-4 items-center w-full max-w-5xl relative">
          {/* Classical texture overlay */}
          <div className="absolute inset-0 opacity-10 rounded-lg" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(245, 158, 11, 0.1) 2px, rgba(245, 158, 11, 0.1) 4px)'
          }} />

          {/* Window Dimensions Display - Top of Card - Compact */}
          <div className="w-full border-b-2 border-amber-600/30 pb-3 mb-2 relative z-10">
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5 text-amber-200">
                <Ruler className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300">Dimensions:</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <div className="text-[10px] text-amber-500/80 font-medium uppercase tracking-wide">W</div>
                  <div className="font-mono text-sm font-bold text-amber-300">{Math.round(width)} mm</div>
                </div>
                <div className="text-amber-600/50 text-sm">×</div>
                <div className="text-center">
                  <div className="text-[10px] text-amber-500/80 font-medium uppercase tracking-wide">H</div>
                  <div className="font-mono text-sm font-bold text-amber-300">{Math.round(height)} mm</div>
                </div>
                <div className="text-amber-600/30">|</div>
                <div className="text-center">
                  <div className="text-[10px] text-amber-500/80 font-medium uppercase tracking-wide">Area</div>
                  <div className="font-mono text-xs font-semibold text-amber-400">{(width * height / 1_000_000).toFixed(2)} m²</div>
                </div>
              </div>
            </div>
          </div>

          {/* Pattern Selector Section */}
          {patterns.length > 0 && (
            <div className="flex flex-col gap-2 w-full max-w-md relative z-10">
              <Label className="typography-label text-sm font-semibold text-amber-200 flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500 text-shadow-glow" />
                Preset Pattern
              </Label>
              <Select
                value={selectedPatternId || 'none'}
                onValueChange={(value) => handlePatternSelect(value)}
              >
                <SelectTrigger className="w-full select-trigger-dark text-sm text-amber-200 h-10">
                  <SelectValue placeholder="Select pattern (or draw manually)..." />
                </SelectTrigger>
                <SelectContent className="select-content-dark">
                  <SelectItem value="none">None (Manual Drawing)</SelectItem>
                  {patterns.map(pattern => (
                    <SelectItem key={pattern.id} value={pattern.id} className="text-sm">
                      {pattern.name} ({pattern.layout})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPatternId && (
                <p className="text-xs text-amber-600/70 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Pattern applied: Grid will update automatically
                </p>
              )}

              {/* Preset Suggestions Badge */}
              {!selectedPatternId && suggestedPatterns.length > 0 && showSuggestions && (
                <div className="mt-2 bg-cyan-500/10 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-xs font-medium text-cyan-300 tracking-[0.05em] uppercase">Suggested Patterns:</span>
                    </div>
                    <button
                      onClick={() => setShowSuggestions(false)}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                      aria-label="Hide suggestions"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedPatterns.slice(0, 3).map((match, _index) => (
                      <button
                        key={match.pattern.id}
                        onClick={() => handleSuggestionClick(match.pattern)}
                        className="text-xs px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-md text-cyan-200 hover:text-cyan-100 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
                        title={`${match.confidence}% match - ${match.matchingFeatures.join(', ')}`}
                      >
                        <span className="font-medium">{match.pattern.name}</span>
                        <span className="text-[10px] opacity-75">({match.confidence}%)</span>
                      </button>
                    ))}
                  </div>
                  {suggestedPatterns[0] && suggestedPatterns[0].matchingFeatures.length > 0 && (
                    <p className="text-[10px] text-cyan-400/80 mt-2">
                      Matches: {suggestedPatterns[0].matchingFeatures.slice(0, 2).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Grid Structure Controls - Enhanced Layout */}
          <div className="flex flex-wrap justify-center gap-4 w-full">
            <div className="flex flex-col items-center gap-2 card-dark rounded-lg px-4 py-3 min-w-[120px] shadow-glow-premium relative z-10" title="Vertical divisions (columns)">
              <div className="flex items-center gap-2 text-amber-200 mb-1 font-semibold">
                <Columns className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium tracking-[0.05em] uppercase">Columns</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateGridStructure(grid.rows, Math.max(1, grid.cols - 1))}
                  className="btn-secondary-dark"
                  aria-label="Decrease columns"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <span className="text-lg font-bold text-white min-w-[2ch] text-center">{grid.cols}</span>
                <button
                  onClick={() => updateGridStructure(grid.rows, Math.min(12, grid.cols + 1))}
                  className="btn-secondary-dark"
                  aria-label="Increase columns"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 card-dark rounded-lg px-4 py-3 min-w-[120px] shadow-glow-premium relative z-10" title="Horizontal divisions (rows)">
              <div className="flex items-center gap-2 text-amber-200 mb-1 font-semibold">
                <Rows className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium tracking-[0.05em] uppercase">Rows</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateGridStructure(Math.max(1, grid.rows - 1), grid.cols)}
                  className="btn-secondary-dark"
                  aria-label="Decrease rows"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <span className="text-lg font-bold text-white min-w-[2ch] text-center">{grid.rows}</span>
                <button
                  onClick={() => updateGridStructure(Math.min(8, grid.rows + 1), grid.cols)}
                  className="btn-secondary-dark"
                  aria-label="Increase rows"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Mullion Drawing Tools - Enhanced with Position Input */}
          <div className="flex flex-col gap-3 w-full border-t-2 border-amber-600/30 pt-4">
            <Label className="typography-label text-sm font-semibold text-amber-200 flex items-center gap-2 relative z-10">
              <Square className="h-4 w-4 text-amber-500 text-shadow-glow" />
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
                className="btn-primary"
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
                className="btn-primary"
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
                className="btn-primary"
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
                className="btn-primary"
                title="Add vertical mullion inside sash"
              >
                <Minus className="h-3.5 w-3.5 mr-1.5 rotate-90" />
                Sash V
              </Toggle>
            </div>

            {/* Position Input Box - Shows when mullion mode is active */}
            {showMullionInput && (
              <div className="flex flex-col gap-2 card-dark rounded-lg p-4 shadow-glow-premium relative z-10">
                <div className="flex items-center justify-between">
                  <Label className="typography-label text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-amber-500" />
                    {mullionMode.includes('horizontal') ? 'Horizontal' : 'Vertical'} Mullion Position(s) (mm)
                  </Label>
                  {mullionMode.startsWith('sash-') && (
                    <span className="text-xs text-amber-400 font-semibold">
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
                  className="w-full textarea-dark text-sm text-amber-200 rounded-lg px-4 py-2.5 min-h-[80px]"
                  rows={3}
                />
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleAddMullionsFromInput}
                    disabled={!mullionPositionInput.trim() || (mullionMode.startsWith('sash-') && !selectedSashForMullion)}
                    className="btn-primary-gradient font-bold text-xs h-8"
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
                <p className="text-[10px] text-amber-600/70">
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
                  Selected: {(grid.cells && Array.isArray(grid.cells) ? grid.cells.find(c => c.id === selectedSashForMullion)?.id : null) || 'Sash'}
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

          {/* Phase 2: Enhanced Editing Tools - Compact */}
          <div className="flex flex-wrap justify-center gap-2 w-full border-t-2 border-amber-600/30 pt-3 relative z-10">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-semibold text-amber-200">Edit:</Label>
              {/* Phase 2: Undo/Redo buttons - Compact */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={!canUndo}
                className="btn-secondary-dark text-xs h-8 px-3 min-w-[32px] disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo last action (Ctrl+Z)"
              >
                <Undo className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRedo}
                disabled={!canRedo}
                className="btn-secondary-dark text-xs h-6 px-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Redo last action (Ctrl+Y or Ctrl+Shift+Z)"
              >
                <Redo className="h-3 w-3" />
              </Button>
              <div className="w-px h-4 bg-amber-600/30 mx-0.5" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={selectedCellIds.size === 0}
                className="btn-secondary-dark text-xs h-6 px-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copy selected cells (Ctrl+C)"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePaste}
                disabled={!hasGridClipboardData()}
                className="btn-secondary-dark text-xs h-6 px-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Paste cells (Ctrl+V)"
              >
                <ClipboardPaste className="h-3 w-3" />
              </Button>
              <div className="w-px h-4 bg-amber-600/30 mx-0.5" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleMirrorHorizontal}
                className="btn-secondary-dark text-xs h-6 px-2"
                title="Mirror grid horizontally"
              >
                <FlipHorizontal className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMirrorVertical}
                className="btn-secondary-dark text-xs h-6 px-2"
                title="Mirror grid vertically"
              >
                <FlipVertical className="h-3 w-3" />
              </Button>
              <div className="w-px h-4 bg-amber-600/30 mx-0.5" />
              <Toggle
                pressed={showMeasurements}
                onPressedChange={setShowMeasurements}
                className="btn-secondary-dark text-xs h-6 px-2"
                title="Toggle measurement overlay"
              >
                <Layers className="h-3 w-3" />
              </Toggle>
              {selectedCellIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-xs h-6 px-2 text-amber-400"
                >
                  Clear ({selectedCellIds.size})
                </Button>
              )}
            </div>
          </div>

          {/* Proportions Input Section - Enhanced */}
          <div className="flex flex-wrap justify-center gap-4 w-full border-t-2 border-amber-600/30 pt-4 relative z-10">
            <div className="flex flex-col gap-2 flex-1 min-w-[240px] max-w-[280px]">
              <div className="flex items-center justify-between">
                <Label className="typography-label text-xs font-semibold text-amber-200 flex items-center gap-1.5">
                  <List className="h-3.5 w-3.5 text-amber-500 text-shadow-glow" />
                  Column Widths
                </Label>
                <button
                  onClick={() => {
                    const equal = Array(grid.cols).fill(1);
                    setColWidthsInput(equal.join(','));
                    handleGridChangeWithHistory({ ...grid, colWidths: equal });
                  }}
                  className="btn-small-dark text-[10px] text-amber-200"
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
                    handleGridChangeWithHistory({ ...grid, colWidths: parts });
                  } else if (!colWidthsInput.trim()) {
                    handleGridChangeWithHistory({ ...grid, colWidths: undefined });
                  }
                }}
                placeholder="600,800,600"
                className="w-full input-dark text-sm text-amber-200 rounded-lg px-4 py-2.5"
              />
            </div>

            <div className="flex flex-col gap-2 flex-1 min-w-[240px] max-w-[280px]">
              <div className="flex items-center justify-between">
                <Label className="typography-label text-xs font-medium text-gray-300 flex items-center gap-1.5">
                  <List className="h-3.5 w-3.5 text-amber-500" />
                  Row Heights
                </Label>
                <button
                  onClick={() => {
                    const equal = Array(grid.rows).fill(1);
                    setRowHeightsInput(equal.join(','));
                    handleGridChangeWithHistory({ ...grid, rowHeights: equal });
                  }}
                  className="btn-small-dark text-[10px] text-amber-200"
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
                    handleGridChangeWithHistory({ ...grid, rowHeights: parts });
                  } else if (!rowHeightsInput.trim()) {
                    handleGridChangeWithHistory({ ...grid, rowHeights: undefined });
                  }
                }}
                placeholder="400,1100"
                className="w-full input-dark text-sm text-amber-200 rounded-lg px-4 py-2.5"
              />
            </div>
          </div>

          {/* Grid Info */}
          <div className="text-xs text-gray-400 font-mono bg-gray-800/40 px-3 py-1.5 rounded border border-gray-700/50">
            {grid.cols}×{grid.rows} Grid
            {grid.manualMullions && grid.manualMullions.length > 0 && (
              <span className="ml-2 text-amber-400">
                • {grid.manualMullions.length} Mullion{grid.manualMullions.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Canvas Area - Full height when toolbar hidden */}
      <div className={cn(
        "relative w-full bg-[#0a0a0a] /40 rounded-lg overflow-hidden flex items-center justify-center shadow-glow-premium card-premium",
        showToolbar ? "aspect-video p-6" : "flex-1 p-4"
      )}>
        <div
          ref={containerRef}
          className="relative shadow-premium w-full h-full focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all duration-300"
          style={{ touchAction: 'none' }}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          role="grid"
          aria-label="Drawing Canvas. Use Arrow Keys to navigate, Enter to select."
          onFocus={() => !focusedCellId && setFocusedCellId('0-0')}
        >
          <svg
            ref={canvasRef}
            key={`grid-${grid.cols}-${grid.rows}-${grid.cells?.length || 0}`}
            viewBox={`${-offsetX} ${-offsetY} ${svgWidth / zoomLevel} ${svgHeight / zoomLevel}`}
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
                      {/* ✅ ENHANCED: Extract delete button to reusable component */}
                      <MullionDeleteButton
                        mullionId={mullion.id}
                        x={svgWidth - 30}
                        y={y}
                        onDelete={handleRemoveMullion}
                      />
                      <MullionDeleteButton
                        mullionId={mullion.id}
                        x={30}
                        y={y}
                        onDelete={handleRemoveMullion}
                      />
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
                      {/* ✅ ENHANCED: Extract delete button to reusable component */}
                      <MullionDeleteButton
                        mullionId={mullion.id}
                        x={x}
                        y={30}
                        onDelete={handleRemoveMullion}
                      />
                      <MullionDeleteButton
                        mullionId={mullion.id}
                        x={x}
                        y={svgHeight - 30}
                        onDelete={handleRemoveMullion}
                      />
                    </g>
                  );
                }
              }
              return null;
            })}

            {/* Phase 2: Grid Measurement Overlay */}
            <GridMeasurementOverlay
              grid={grid}
              width={width}
              height={height}
              svgWidth={svgWidth}
              svgHeight={svgHeight}
              colStarts={colStarts}
              rowStarts={rowStarts}
              colWidthsPx={colWidthsPx}
              rowHeightsPx={rowHeightsPx}
              highlightedCellIds={selectedCellIds}
              showDimensions={showMeasurements}
            />

            {/* Render Cells */}
            {grid.cells && Array.isArray(grid.cells) ? grid.cells.map((cell) => {
              const x = colStarts[cell.col];
              const y = rowStarts[cell.row];
              const w = colWidthsPx[cell.col];
              const h = rowHeightsPx[cell.row];
              const isSelectedForMullion = selectedSashForMullion === cell.id;
              const isSelected = isCellSelected(cell.id); // Phase 2: Multi-select

              return (
                <g
                  key={cell.id}
                  onClick={(e) => {
                    // Only handle cell click if not in mullion mode or if clicking on mullion delete button
                    if (mullionMode === 'none') {
                      handleCellClick(cell.id, e);
                    }
                  }}
                  onContextMenu={(e) => {
                    // Phase 3: Hardware integration - Context menu support
                    if (onCellContextMenu && mullionMode === 'none') {
                      e.preventDefault();
                      e.stopPropagation();
                      const svgElement = e.currentTarget.closest('svg');
                      if (svgElement) {
                        const rect = svgElement.getBoundingClientRect();
                        const position = {
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top,
                        };
                        onCellContextMenu(cell.id, position, e);
                      }
                    }
                  }}
                  onMouseEnter={() => handleMouseEnter(cell.id)}
                  onMouseLeave={handleMouseLeave}
                  className={mullionMode === 'none' ? "cursor-pointer transition-opacity hover:opacity-90" : "cursor-crosshair"}
                >
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={getCellFill(cell.type, hoveredCell === cell.id || isSelectedForMullion || isSelected)}
                    stroke={isSelectedForMullion ? '#f97316' : (isSelected ? '#f59e0b' : getCellStroke(cell.type))}
                    strokeWidth={isSelectedForMullion ? 3 : (isSelected ? 3 : (hoveredCell === cell.id ? 3 : 2))}
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


                  {/* Phase 9: Focused Cell Indicator */}
                  {focusedCellId === cell.id && (
                    <rect
                      x={x + 3} y={y + 3}
                      width={w - 6} height={h - 6}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                      className="animate-pulse pointer-events-none"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))' }}
                    />
                  )}
                </g>
              );
            }) : null}



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

      {/* Enhanced Legend - Only show when toolbar is visible */}
      {showToolbar && (
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
            <div className="btn-primary" />
            <span className="font-semibold text-amber-200">Panel</span>
          </div>
          <div className="flex items-center gap-2 ml-4 pl-4 border-l-2 border-amber-600/30">
            <div className="btn-primary" />
            <span className="font-semibold text-amber-200">Mullion</span>
          </div>
        </div>
      )}
    </div>
  );
};
