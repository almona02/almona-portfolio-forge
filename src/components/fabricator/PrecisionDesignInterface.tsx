import { generateComponentsFromGrid } from '@/algorithms/smartDraw';
import { EGYPTIAN_PATTERNS, getPatternsForSystem } from '@/data/egyptian-window-patterns';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { SimplifiedOptimizationEngine } from '@/lib/fabricator/OptimizationEngine';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { cn } from '@/lib/utils';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { GridCell, Profile, WindowGrid, WindowUnit } from '@/types/fabricator';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CALCULATION_MULTIPLIERS,
  CELL_CONSTRAINTS,
  GRID_DEFAULTS,
  INTERACTION_TOLERANCES,
  PROFILE_CONSTANTS,
  SVG_CONSTANTS,
  VIEW_CONSTANTS,
} from './designConstants';

interface PrecisionDesignInterfaceProps {
  project: WindowUnit | null;
  profiles: Profile[];
  grid: WindowGrid;
  onGridChange: (grid: WindowGrid) => void;
  className?: string;
}

type DragState = {
  type: 'mullion-vertical' | 'mullion-horizontal' | 'split-vertical' | 'split-horizontal' | null;
  index: number;
  startX?: number;
  startY?: number;
};

type HUDState = {
  cellId: string | null;
  x: number;
  y: number;
};

export const PrecisionDesignInterface: React.FC<PrecisionDesignInterfaceProps> = ({
  project,
  profiles,
  grid,
  onGridChange,
  className
}) => {
  const [selectedPatternId, setSelectedPatternId] = useState<string>('');
  const [dragState, setDragState] = useState<DragState>({ type: null, index: -1 });
  const [hudState, setHudState] = useState<HUDState>({ cellId: null, x: 0, y: 0 });
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(VIEW_CONSTANTS.DEFAULT_ZOOM);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: VIEW_CONSTANTS.DEFAULT_PAN_X, y: VIEW_CONSTANTS.DEFAULT_PAN_Y });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Load Turkish custom profiles
  const [availableSystemPacks, setAvailableSystemPacks] = useState(SYSTEM_PACKS);

  useEffect(() => {
    // Load Turkish custom profiles from localStorage
    const loadTurkishProfiles = () => {
      const turkishProfiles: any[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('custom-profile-')) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const profileData = JSON.parse(stored);
              // Convert to SystemPack format
              turkishProfiles.push({
                meta: {
                  id: profileData.id,
                  name: profileData.name,
                  brands: [profileData.manufacturer],
                  regions: ['turkey'],
                  defaultStockLengthMm: profileData.profiles?.[0]?.barLength || PROFILE_CONSTANTS.DEFAULT_STOCK_LENGTH_MM,
                },
                windowSystemSpec: {
                  ...profileData,
                  isCustom: true,
                },
                smartDrawPreset: profileData.smartDrawPreset,
              });
            }
          } catch (error) {
            console.error('Error loading Turkish profile:', error);
          }
        }
      }
      
      setAvailableSystemPacks([...SYSTEM_PACKS, ...turkishProfiles]);
    };

    loadTurkishProfiles();
    
    // Listen for new Turkish profiles
    const handleLoadTurkishProfile = (e: any) => {
      // Load specific profile into project
      const profile = e.detail;
      if (project && onGridChange) {
        // Update project with Turkish profile
        // This would need to be handled by parent component
        console.log('Load Turkish profile:', profile);
      }
    };
    
    window.addEventListener('customProfileAdded', loadTurkishProfiles);
    window.addEventListener('loadTurkishProfile', handleLoadTurkishProfile);
    
    return () => {
      window.removeEventListener('customProfileAdded', loadTurkishProfiles);
      window.removeEventListener('loadTurkishProfile', handleLoadTurkishProfile);
    };
  }, [project, onGridChange]);

  // Get system pack info (including Turkish custom profiles)
  const systemPack = useMemo(() => {
    if (!project?.systemPackId) return null;
    return availableSystemPacks.find(p => p.meta.id === project.systemPackId) || null;
  }, [project?.systemPackId, availableSystemPacks]);

  // Get available patterns for current system
  const availablePatterns = useMemo(() => {
    if (!project?.systemPackId) return [];
    return getPatternsForSystem(project.systemPackId);
  }, [project?.systemPackId]);

  // Handle pattern selection - auto-populate grid
  const handlePatternSelect = useCallback((patternId: string) => {
    setSelectedPatternId(patternId);
    const pattern = EGYPTIAN_PATTERNS.find(p => p.id === patternId);
    if (!pattern) return;

    // Convert pattern layout to WindowGrid
    // Parse layout string to determine grid dimensions
    let rows: number = GRID_DEFAULTS.DEFAULT_ROWS;
    let cols: number = GRID_DEFAULTS.DEFAULT_COLS;
    
    // Extract number from layout string (e.g., "2-panel sliding" -> 2)
    const panelMatch = pattern.layout.match(/(\d+)[- ]panel/);
    if (panelMatch) {
      const panelCount = parseInt(panelMatch[1], 10);
      // For sliding windows, panels are side-by-side (1 row, N cols)
      if (pattern.type === 'sliding' || pattern.type === 'door') {
        rows = GRID_DEFAULTS.DEFAULT_ROWS;
        cols = panelCount;
      } else {
        // For other types, try to create a square-ish grid
        rows = Math.ceil(Math.sqrt(panelCount));
        cols = Math.ceil(panelCount / rows);
      }
    } else if (pattern.layout.includes('single') || pattern.layout.includes('lite')) {
      rows = GRID_DEFAULTS.DEFAULT_ROWS;
      cols = GRID_DEFAULTS.DEFAULT_COLS;
    }

    const newGrid: WindowGrid = {
      rows,
      cols,
      cells: []
    };

    // Generate cells based on pattern type
    for (let r = 0; r < newGrid.rows; r++) {
      for (let c = 0; c < newGrid.cols; c++) {
        const cellId = `${r}-${c}`;
        let cellType: GridCell['type'] = 'fixed';
        
        // Determine cell type based on pattern
        if (pattern.type === 'sliding' || pattern.type === 'door') {
          cellType = 'sliding'; // All cells are sliding for sliding patterns
        } else if (pattern.type === 'casement') {
          cellType = 'sash';
        } else if (pattern.type === 'fixed') {
          cellType = 'fixed';
        } else if (pattern.type === 'mixed') {
          // Mixed patterns - center fixed, sides casement
          if (newGrid.cols > 1 && c === Math.floor(newGrid.cols / 2)) {
            cellType = 'fixed';
          } else {
            cellType = 'sash';
          }
        }
        
        newGrid.cells.push({
          id: cellId,
          row: r,
          col: c,
          type: cellType
        });
      }
    }

    // Update project dimensions to pattern's typical dimensions if needed
    if (project && pattern.typicalWidthMm && pattern.typicalHeightMm) {
      const _midWidth = Math.round((pattern.typicalWidthMm[0] + pattern.typicalWidthMm[1]) / 2);
      const _midHeight = Math.round((pattern.typicalHeightMm[0] + pattern.typicalHeightMm[1]) / 2);
      // Note: We can't directly update project here, but the grid change will trigger re-render
    }

    onGridChange(newGrid);
  }, [onGridChange, project]);

  // Get glass info
  const glassInfo = useMemo(() => {
    if (!project?.glazing) return 'N/A';
    const glazing = project.glazing as any;
    if (glazing.thickness && glazing.spacer) {
      return `${glazing.thickness}mm+${glazing.spacer}+${glazing.thickness}mm`;
    }
    return glazing.type || 'N/A';
  }, [project?.glazing]);

  // Get color info
  const colorInfo = useMemo(() => {
    return project?.color || 'N/A';
  }, [project?.color]);

  // Generate components from grid (Gold Tier: with system pack integration)
  const components = useMemo(() => {
    if (!project || !grid) return [];
    const systemPackId = project.systemPackId || null;
    const systemPack = systemPackId ? SYSTEM_PACKS.find(p => p.meta.id === systemPackId) || null : null;
    const result = generateComponentsFromGrid(project, grid, profiles, systemPackId, systemPack);
    return result.components;
  }, [project, grid, profiles]);

  // Calculate waste and efficiency
  const wasteMetrics = useMemo(() => {
    if (components.length === 0) {
      return { efficiency: 0, wastePercentage: 0, price: 0, materialWeight: 0 };
    }

    try {
      const optimizationEngine = new SimplifiedOptimizationEngine();

      // Convert components to cuts
      const cuts = components.flatMap(comp => 
        comp.cuttingLengths.map((length, idx) => ({
          id: `${comp.id}-${idx}`,
          label: `${comp.type}-${idx}`,
          plannedLength: length,
          profileId: comp.profile.id,
          role: comp.type as any,
          quantity: comp.quantity
        }))
      );

      // Get unique profiles
      const uniqueProfiles = Array.from(new Map(components.map(c => [c.profile.id, c.profile])).values());

      // Optimize for each profile
      let totalWaste = 0;
      let totalMaterial = 0;
      let totalPrice = 0;
      let totalWeight = 0;

      for (const profile of uniqueProfiles) {
        const profileCuts = cuts.filter(c => c.profileId === profile.id);
        if (profileCuts.length === 0) continue;

        const optimizationResult = optimizationEngine.optimize(
          profileCuts,
          project?.systemPackId
        );

        // Calculate total material used from bars
        const totalBarLength = optimizationResult.bars.reduce((sum, bar) => sum + bar.nominalLength, 0);
        totalWaste += optimizationResult.waste;
        totalMaterial += totalBarLength;

        // Calculate price
        const _pricingEngine = new PricingEngine({ region: 'egypt', currency: 'EGP' });
        const lengthM = totalBarLength / CALCULATION_MULTIPLIERS.MM_TO_M;
        const price = profile.costPerMeter ? lengthM * profile.costPerMeter : 0;
        totalPrice += price;

        // Calculate weight
        const weightPerM = profile.weightPerMeter || 0;
        totalWeight += lengthM * weightPerM;
      }

      const efficiency = totalMaterial > 0 ? ((totalMaterial - totalWaste) / totalMaterial) * 100 : 0;
      const wastePercentage = totalMaterial > 0 ? (totalWaste / totalMaterial) * 100 : 0;

      return {
        efficiency: Math.round(efficiency * CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_1_DECIMAL) / CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_1_DECIMAL,
        wastePercentage: Math.round(wastePercentage * CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_1_DECIMAL) / CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_1_DECIMAL,
        price: Math.round(totalPrice * CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_2_DECIMAL) / CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_2_DECIMAL,
        materialWeight: Math.round(totalWeight * CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_1_DECIMAL) / CALCULATION_MULTIPLIERS.ROUNDING_MULTIPLIER_1_DECIMAL
      };
    } catch (error) {
      console.error('Error calculating waste metrics:', error);
      return { efficiency: 0, wastePercentage: 0, price: 0, materialWeight: 0 };
    }
  }, [components, project?.systemPackId]);

  // Calculate cell dimensions with proper aspect ratio
  // Use fixed dimensions to avoid floating point precision issues
  const baseSvgWidth = SVG_CONSTANTS.BASE_SVG_WIDTH_PX;
  const baseSvgHeight = project && project.overallWidth > 0 
    ? Math.round((project.overallHeight / project.overallWidth) * SVG_CONSTANTS.BASE_SVG_WIDTH_PX) 
    : SVG_CONSTANTS.BASE_SVG_HEIGHT_PX;
  const svgWidth = baseSvgWidth;
  const svgHeight = baseSvgHeight;

  const colWeights = grid.colWidths && grid.colWidths.length === grid.cols 
    ? grid.colWidths 
    : Array(grid.cols).fill(1);
  const rowWeights = grid.rowHeights && grid.rowHeights.length === grid.rows 
    ? grid.rowHeights 
    : Array(grid.rows).fill(1);
  
  const totalColWeight = colWeights.reduce((a, b) => a + b, 0) || grid.cols;
  const totalRowWeight = rowWeights.reduce((a, b) => a + b, 0) || grid.rows;
  
  // Memoize array calculations to prevent unnecessary re-renders
  const { colStarts, rowStarts, colWidthsPx, rowHeightsPx } = useMemo(() => {
    const colStarts: number[] = [];
    const rowStarts: number[] = [];
    const colWidthsPx: number[] = [];
    const rowHeightsPx: number[] = [];

    colWeights.reduce((acc, w) => {
      colStarts.push(acc);
      colWidthsPx.push((w / totalColWeight) * svgWidth);
      return acc + (w / totalColWeight) * svgWidth;
    }, 0);

    rowWeights.reduce((acc, w) => {
      rowStarts.push(acc);
      rowHeightsPx.push((w / totalRowWeight) * svgHeight);
      return acc + (w / totalRowWeight) * svgHeight;
    }, 0);

    return { colStarts, rowStarts, colWidthsPx, rowHeightsPx };
  }, [colWeights, rowWeights, totalColWeight, totalRowWeight, svgWidth, svgHeight]);

  // Get system max width constraint
  const maxSashWidth = useMemo(() => {
    if (!systemPack?.smartDrawPreset) return CELL_CONSTRAINTS.DEFAULT_MAX_SASH_WIDTH_MM; // Default
    return systemPack.smartDrawPreset.maxPanelWidthMm || CELL_CONSTRAINTS.DEFAULT_MAX_SASH_WIDTH_MM;
  }, [systemPack]);

  // Check constraints for each cell
  const constraintViolations = useMemo(() => {
    const violations = new Set<string>();
    if (!project) return violations;

    grid.cells.forEach(cell => {
      const cellWidth = (project.overallWidth / grid.cols) * (colWeights[cell.col] / totalColWeight);
      if (cellWidth > maxSashWidth) {
        violations.add(cell.id);
      }
    });

    return violations;
  }, [grid, project, colWeights, totalColWeight, maxSashWidth]);

  // Handle split vertical
  const handleSplitVertical = useCallback((colIndex: number) => {
    const newCols = grid.cols + 1;
    const newCells: GridCell[] = [];

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < newCols; c++) {
        if (c <= colIndex) {
          // Existing cells before split
          const existing = grid.cells.find(cell => cell.row === r && cell.col === c);
          if (existing) {
            newCells.push(existing);
          } else {
            newCells.push({ id: `${r}-${c}`, row: r, col: c, type: 'fixed' });
          }
        } else {
          // Shift existing cells after split
          const existing = grid.cells.find(cell => cell.row === r && cell.col === c - 1);
          if (existing) {
            newCells.push({ ...existing, id: `${r}-${c}`, col: c });
          } else {
            newCells.push({ id: `${r}-${c}`, row: r, col: c, type: 'fixed' });
          }
        }
      }
    }

    // Update colWidths
    const newColWidths = [...colWeights];
    const splitWidth = newColWidths[colIndex] / 2;
    newColWidths[colIndex] = splitWidth;
    newColWidths.splice(colIndex + 1, 0, splitWidth);

    onGridChange({
      ...grid,
      cols: newCols,
      cells: newCells,
      colWidths: newColWidths
    });
  }, [grid, colWeights, onGridChange]);

  // Handle split horizontal
  const handleSplitHorizontal = useCallback((rowIndex: number) => {
    const newRows = grid.rows + 1;
    const newCells: GridCell[] = [];

    for (let r = 0; r < newRows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (r <= rowIndex) {
          const existing = grid.cells.find(cell => cell.row === r && cell.col === c);
          if (existing) {
            newCells.push(existing);
          } else {
            newCells.push({ id: `${r}-${c}`, row: r, col: c, type: 'fixed' });
          }
        } else {
          const existing = grid.cells.find(cell => cell.row === r - 1 && cell.col === c);
          if (existing) {
            newCells.push({ ...existing, id: `${r}-${c}`, row: r });
          } else {
            newCells.push({ id: `${r}-${c}`, row: r, col: c, type: 'fixed' });
          }
        }
      }
    }

    const newRowHeights = [...rowWeights];
    const splitHeight = newRowHeights[rowIndex] / 2;
    newRowHeights[rowIndex] = splitHeight;
    newRowHeights.splice(rowIndex + 1, 0, splitHeight);

    onGridChange({
      ...grid,
      rows: newRows,
      cells: newCells,
      rowHeights: newRowHeights
    });
  }, [grid, rowWeights, onGridChange]);

  // Handle drag mullion
  const handleDragMullion = useCallback((colIndex: number, deltaX: number) => {
    if (!project) return;

    const newColWidths = [...colWeights];
    const deltaWeight = (deltaX / svgWidth) * totalColWeight;

    // Check constraints
    const leftCellWidth = ((newColWidths[colIndex] + deltaWeight) / totalColWeight) * project.overallWidth;
    const rightCellWidth = ((newColWidths[colIndex + 1] - deltaWeight) / totalColWeight) * project.overallWidth;

    if (leftCellWidth < CELL_CONSTRAINTS.MIN_CELL_WIDTH_MM || rightCellWidth < CELL_CONSTRAINTS.MIN_CELL_WIDTH_MM) return; // Min width
    if (leftCellWidth > maxSashWidth || rightCellWidth > maxSashWidth) return; // Max width

    newColWidths[colIndex] += deltaWeight;
    newColWidths[colIndex + 1] -= deltaWeight;

    onGridChange({
      ...grid,
      colWidths: newColWidths
    });
  }, [grid, colWeights, totalColWeight, project, svgWidth, maxSashWidth, onGridChange]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const svgX = (x / rect.width) * svgWidth;
    const svgY = (y / rect.height) * svgHeight;

    // Check if clicking on a mullion (vertical)
    for (let i = 1; i < colStarts.length; i++) {
      const mullionX = colStarts[i];
      if (Math.abs(svgX - mullionX) < INTERACTION_TOLERANCES.MULLION_CLICK_TOLERANCE_PX) {
        setDragState({ type: 'mullion-vertical', index: i - 1, startX: x });
        return;
      }
    }

    // Check if clicking on a transom (horizontal)
    for (let i = 1; i < rowStarts.length; i++) {
      const transomY = rowStarts[i];
      if (Math.abs(svgY - transomY) < INTERACTION_TOLERANCES.MULLION_CLICK_TOLERANCE_PX) {
        setDragState({ type: 'mullion-horizontal', index: i - 1, startY: y });
        return;
      }
    }

    // Check if clicking in a cell (for split)
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const cellX = colStarts[c];
        const cellY = rowStarts[r];
        const cellW = colWidthsPx[c];
        const cellH = rowHeightsPx[r];

        if (svgX >= cellX && svgX <= cellX + cellW && svgY >= cellY && svgY <= cellY + cellH) {
          // Check if near vertical edge (split vertical)
          if (Math.abs(svgX - cellX) < INTERACTION_TOLERANCES.SPLIT_EDGE_TOLERANCE_PX && c > 0) {
            setDragState({ type: 'split-vertical', index: c - 1, startX: x });
            return;
          }
          if (Math.abs(svgX - (cellX + cellW)) < 20 && c < grid.cols - 1) {
            setDragState({ type: 'split-vertical', index: c, startX: x });
            return;
          }
          // Check if near horizontal edge (split horizontal)
          if (Math.abs(svgY - cellY) < 20 && r > 0) {
            setDragState({ type: 'split-horizontal', index: r - 1, startY: y });
            return;
          }
          if (Math.abs(svgY - (cellY + cellH)) < 20 && r < grid.rows - 1) {
            setDragState({ type: 'split-horizontal', index: r, startY: y });
            return;
          }
        }
      }
    }
  }, [grid, colStarts, rowStarts, colWidthsPx, rowHeightsPx, svgWidth, svgHeight]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || dragState.type === null) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const _y = e.clientY - rect.top;

    if (dragState.type === 'mullion-vertical' && dragState.startX !== undefined) {
      const deltaX = x - dragState.startX;
      const deltaSvgX = (deltaX / rect.width) * svgWidth;
      handleDragMullion(dragState.index, deltaSvgX);
      setDragState(prev => ({ ...prev, startX: x }));
    }
  }, [dragState, svgWidth, handleDragMullion]);

  const handleMouseUp = useCallback(() => {
    if (dragState.type === 'split-vertical') {
      handleSplitVertical(dragState.index);
    } else if (dragState.type === 'split-horizontal') {
      handleSplitHorizontal(dragState.index);
    }
    setDragState({ type: null, index: -1 });
  }, [dragState, handleSplitVertical, handleSplitHorizontal]);

  // Handle cell click for HUD
  const handleCellClick = useCallback((e: React.MouseEvent, cellId: string) => {
    e.stopPropagation();
    if (!svgRef.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    setHudState({ cellId, x: e.clientX - containerRect.left, y: e.clientY - containerRect.top });
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !project) return;
    const container = containerRef.current;
    const containerWidth = container.clientWidth - 40; // padding
    const containerHeight = container.clientHeight - 40;
    
    const scaleX = containerWidth / svgWidth;
    const scaleY = containerHeight / svgHeight;
    const newZoom = Math.min(scaleX, scaleY, 1);
    
    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
  }, [project, svgWidth, svgHeight]);

  // Pan handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
    }
  }, []);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  }, [isPanning, panStart]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Change cell type
  const handleChangeCellType = useCallback((cellId: string, newType: GridCell['type']) => {
    const newCells = grid.cells.map(cell => 
      cell.id === cellId ? { ...cell, type: newType } : cell
    );
    onGridChange({ ...grid, cells: newCells });
    // Keep HUD open to show the change - don't close it immediately
    // setHudState({ cellId: null, x: 0, y: 0 });
  }, [grid, onGridChange]);

  if (!project) {
    return (
      <div className={cn("flex items-center justify-center h-96 bg-white border-2 border-gray-300", className)}>
        <p className="text-gray-500 text-lg">No project loaded</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-white", className)}>
      {/* Top Bar: System Info */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b-2 border-gray-300">
        <div className="flex items-center gap-6 text-sm font-semibold">
          <div>
            <span className="text-gray-600">System: </span>
            <span className="text-gray-900">{systemPack?.meta.name || project.systemPackId || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-600">Glass: </span>
            <span className="text-gray-900">{glassInfo}</span>
          </div>
          <div>
            <span className="text-gray-600">Color: </span>
            <span className="text-gray-900">{colorInfo}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Pattern Selector */}
          {availablePatterns.length > 0 && (
            <div className="flex items-center gap-3">
              <Label className="typography-label text-sm text-gray-600 font-semibold">Pattern:</Label>
              <Select
                value={selectedPatternId}
                onValueChange={handlePatternSelect}
              >
                <SelectTrigger className="w-[200px] bg-white border-gray-300 text-sm">
                  <SelectValue placeholder="Select Pattern..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {availablePatterns.map((pattern) => (
                    <SelectItem key={pattern.id} value={pattern.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{pattern.name}</span>
                        <span className="text-xs text-gray-500">{pattern.layout}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Quick Zoom Controls in Top Bar */}
          <div className="flex items-center gap-2 border-l border-gray-300 pl-4">
            <span className="text-xs text-gray-500 mr-1">Zoom:</span>
            <button
              onClick={handleZoomOut}
              className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded text-sm font-semibold transition-colors"
              title="Zoom Out (Ctrl + Scroll)"
            >
              −
            </button>
            <span className="px-2 text-xs font-medium text-gray-700 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded text-sm font-semibold transition-colors"
              title="Zoom In (Ctrl + Scroll)"
            >
              +
            </button>
            <button
              onClick={handleFitToScreen}
              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded text-xs font-medium text-blue-700 transition-colors ml-1"
              title="Fit to Screen"
            >
              Fit
            </button>
          </div>
        </div>
      </div>

      {/* Center: Blueprint Canvas with Zoom/Pan */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-auto bg-gray-50" 
        style={{ 
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)', 
          backgroundSize: '20px 20px',
          cursor: isPanning ? 'grabbing' : 'default'
        }}
        onWheel={handleWheel}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        {/* Zoom Controls Toolbar */}
        <div className="absolute top-4 right-4 z-20 bg-white border-2 border-gray-800 shadow-lg rounded-lg p-2 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded font-semibold text-sm transition-colors"
            title="Zoom In (Ctrl + Scroll)"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded font-semibold text-sm transition-colors"
            title="Zoom Out (Ctrl + Scroll)"
          >
            −
          </button>
          <div className="px-3 py-1 text-xs text-center text-gray-600 border-t border-gray-300 mt-1">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={handleZoomReset}
            className="px-3 py-2 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded font-semibold text-xs transition-colors"
            title="Reset Zoom"
          >
            Reset
          </button>
          <button
            onClick={handleFitToScreen}
            className="px-3 py-2 bg-green-100 hover:bg-green-200 border border-green-300 rounded font-semibold text-xs transition-colors"
            title="Fit to Screen"
          >
            Fit
          </button>
        </div>

        {/* SVG Container with Transform */}
        <div
          className="absolute inset-0 flex items-center justify-center p-5"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${Math.round(svgWidth)} ${Math.round(svgHeight)}`}
            width={Math.round(svgWidth)}
            height={Math.round(svgHeight)}
            className="bg-white border-2 border-gray-800 shadow-2xl"
            style={{ 
              minWidth: Math.round(svgWidth),
              minHeight: Math.round(svgHeight),
              cursor: dragState.type ? 'grabbing' : 'default'
            }}
            onMouseDown={(e) => {
              if (!isPanning && !e.shiftKey) {
                handleMouseDown(e);
              }
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
          {/* Grid lines (light gray) */}
          {colStarts.slice(1).map((xPos, i) => (
            <line
              key={`v-grid-${i}`}
              x1={xPos}
              y1="0"
              x2={xPos}
              y2={svgHeight}
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          ))}
          {rowStarts.slice(1).map((yPos, i) => (
            <line
              key={`h-grid-${i}`}
              x1="0"
              y1={yPos}
              x2={svgWidth}
              y2={yPos}
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          ))}

          {/* Mullions/Transoms (black, 2px) */}
          {colStarts.slice(1).map((xPos, i) => {
            const isViolation = constraintViolations.size > 0 && 
              grid.cells.some(cell => cell.col === i && constraintViolations.has(cell.id));
            return (
              <line
                key={`mullion-v-${i}`}
                x1={xPos}
                y1="0"
                x2={xPos}
                y2={svgHeight}
                stroke={isViolation ? "#ef4444" : "#000000"}
                strokeWidth="2"
                className="cursor-col-resize"
              />
            );
          })}
          {rowStarts.slice(1).map((yPos, i) => (
            <line
              key={`transom-h-${i}`}
              x1="0"
              y1={yPos}
              x2={svgWidth}
              y2={yPos}
              stroke="#000000"
              strokeWidth="2"
              className="cursor-row-resize"
            />
          ))}

          {/* Cells */}
          {grid.cells.map((cell) => {
            const x = colStarts[cell.col];
            const y = rowStarts[cell.row];
            const w = colWidthsPx[cell.col];
            const h = rowHeightsPx[cell.row];
            const isViolation = constraintViolations.has(cell.id);
            const isSelected = hudState.cellId === cell.id;
            const isHovered = hoveredCell === cell.id;
            const cellWidthMm = project ? (project.overallWidth / grid.cols) * (colWeights[cell.col] / totalColWeight) : 0;
            const cellHeightMm = project ? (project.overallHeight / grid.rows) * (rowWeights[cell.row] / totalRowWeight) : 0;

            // Determine cell fill color based on type
            const getCellFill = () => {
              if (isSelected) return "#e0f2fe"; // Light blue when selected
              if (isHovered) return "#f0f9ff"; // Very light blue on hover
              if (cell.type === 'sash') return "#fef3c7"; // Light yellow for sash
              if (cell.type === 'sliding') return "#dbeafe"; // Light blue for sliding
              if (cell.type === 'panel') return "#fef3c7"; // Light amber for panel
              return "white"; // White for fixed/empty
            };

            return (
              <g key={cell.id}>
                {/* Cell background fill */}
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={getCellFill()}
                  fillOpacity={isSelected ? 0.6 : isHovered ? 0.4 : 0.2}
                  stroke="none"
                  onClick={(e) => handleCellClick(e, cell.id)}
                  onMouseEnter={() => setHoveredCell(cell.id)}
                  onMouseLeave={() => setHoveredCell(null)}
                  className="cursor-pointer transition-all duration-200"
                />
                {/* Cell border */}
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill="none"
                  stroke={isViolation ? "#ef4444" : isSelected ? "#2563eb" : "#000000"}
                  strokeWidth={isViolation ? "3" : isSelected ? "3" : "2"}
                  onClick={(e) => handleCellClick(e, cell.id)}
                  onMouseEnter={() => setHoveredCell(cell.id)}
                  onMouseLeave={() => setHoveredCell(null)}
                  className="cursor-pointer transition-all duration-200"
                />

                {/* Dimension labels (big, bold, blue) */}
                <text
                  x={x + w / 2}
                  y={y + h / 2 - 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#2563eb"
                  fontSize="24"
                  fontWeight="bold"
                  className="pointer-events-none select-none"
                >
                  {Math.round(cellWidthMm)}mm
                </text>
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#2563eb"
                  fontSize="24"
                  fontWeight="bold"
                  className="pointer-events-none select-none"
                >
                  {Math.round(cellHeightMm)}mm
                </text>

                {/* Cell type label */}
                <text
                  x={x + w / 2}
                  y={y + 20}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#000000"
                  fontSize="16"
                  fontWeight="600"
                  className="pointer-events-none select-none"
                >
                  {cell.type.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Outer frame */}
          <rect
            x="0"
            y="0"
            width={svgWidth}
            height={svgHeight}
            fill="none"
            stroke="#000000"
            strokeWidth="4"
          />
        </svg>
        </div>

        {/* HUD Panel (floating) - positioned relative to container */}
        {hudState.cellId && (
          <div
            className="absolute bg-white border-2 border-gray-800 shadow-2xl p-4 z-30 rounded-lg"
            style={{
              left: `${hudState.x + 20}px`,
              top: `${hudState.y}px`,
              minWidth: '220px',
              maxWidth: '280px'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="typography-h3 text-sm">Cell Properties</h3>
              <button
                onClick={() => setHudState({ cellId: null, x: 0, y: 0 })}
                className="text-gray-500 hover:text-gray-900"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              {(['fixed', 'sash', 'sliding', 'panel'] as const).map(type => {
                const currentCell = grid.cells.find(c => c.id === hudState.cellId);
                const isActive = currentCell?.type === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleChangeCellType(hudState.cellId!, type)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm border-2 transition-all duration-200 font-medium",
                      isActive
                        ? "border-blue-600 bg-blue-50 text-blue-900 shadow-sm"
                        : "border-gray-300 hover:border-gray-500 hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {isActive && <span className="text-blue-600">✓</span>}
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Waste Meter & Live Stats */}
      <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-300 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <span className="text-sm text-gray-600">Current Design Efficiency: </span>
              <span className={cn(
                "text-lg font-bold",
                wasteMetrics.efficiency >= 90 ? "text-green-600" : 
                wasteMetrics.efficiency >= 75 ? "text-yellow-600" : "text-red-600"
              )}>
                {wasteMetrics.efficiency}%
              </span>
              <span className={cn(
                "ml-2 text-sm",
                wasteMetrics.efficiency >= 90 ? "text-green-600" : 
                wasteMetrics.efficiency >= 75 ? "text-yellow-600" : "text-red-600"
              )}>
                {wasteMetrics.efficiency >= 90 ? "(Excellent)" : 
                 wasteMetrics.efficiency >= 75 ? "(Good)" : "(Needs Improvement)"}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Waste: </span>
              <span className="text-lg font-bold text-red-600">{wasteMetrics.wastePercentage}%</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <div>
              <span className="text-sm text-gray-600">Price: </span>
              <span className="text-lg font-bold text-blue-600">{wasteMetrics.price.toFixed(2)} EGP</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Material Weight: </span>
              <span className="text-lg font-bold text-gray-900">{wasteMetrics.materialWeight} kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

