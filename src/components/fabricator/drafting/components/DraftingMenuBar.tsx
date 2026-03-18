/**
 * Drafting Menu Bar Component
 * 
 * Professional menu system for Drafting Workbench with File, Edit, View, Tools, and Help menus.
 * Reuses existing dropdown menu components and integrates with drafting operations.
 * 
 * Constitutional: Deterministic menu system, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { Button } from '@/shared/ui/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from '@/shared/ui/ui/dropdown-menu';
import {
    BookOpen,
    Clipboard,
    Copy,
    Download,
    Eye, EyeOff,
    FileText, FolderOpen,
    Grid3x3,
    HelpCircle,
    Keyboard,
    Maximize2,
    Redo,
    RotateCcw,
    Save,
    Scissors,
    Settings,
    ShieldCheck,
    Trash2,
    Undo,
    Upload,
    Wrench,
    Zap,
    ZoomIn, ZoomOut
} from 'lucide-react';
import React from 'react';
import { toast } from 'sonner';
import { ThemeToggle } from '../../ui/ThemeToggle';
import { useDraftingContext } from '../DraftingContext';
import { copyToClipboard, getClipboardData, preparePasteGeometry } from '../utils/clipboardUtils';
import { safeEventHandler } from '../utils/componentHardening';
import { EnhancedTooltip } from './EnhancedTooltip';

interface DraftingMenuBarProps {
  /** On new project */
  onNew?: () => void;
  /** On open file */
  onOpen?: () => void;
  /** On save */
  onSave?: () => void;
  /** On export DXF */
  onExportDXF?: () => void;
  /** On export JSON */
  onExportJSON?: () => void;
  /** On export PDF */
  onExportPDF?: () => void;
  /** On import */
  onImport?: () => void;
  /** On undo */
  onUndo?: () => void;
  /** On redo */
  onRedo?: () => void;
  /** On cut */
  onCut?: () => void;
  /** On copy */
  onCopy?: () => void;
  /** On paste */
  onPaste?: () => void;
  /** On delete */
  onDelete?: () => void;
  /** On zoom in */
  onZoomIn?: () => void;
  /** On zoom out */
  onZoomOut?: () => void;
  /** On zoom to fit */
  onZoomToFit?: () => void;
  /** On zoom to selection */
  onZoomToSelection?: () => void;
  /** On toggle grid */
  onToggleGrid?: () => void;
  /** On toggle snap */
  onToggleSnap?: () => void;
  /** Grid visible */
  gridVisible?: boolean;
  /** Snap enabled */
  snapEnabled?: boolean;
  /** Can undo */
  canUndo?: boolean;
  /** Can redo */
  canRedo?: boolean;
  /** Has selection */
  hasSelection?: boolean;
  /** On select all */
  onSelectAll?: () => void;
  /** On settings */
  onSettings?: () => void;
  /** On help */
  onHelp?: () => void;
  /** On validate */
  onValidate?: () => void;
  /** On optimize */
  onOptimize?: () => void;
  /** Is optimizing */
  isOptimizing?: boolean;
  /** On recovery restore */
  onRecoveryRestore?: () => void;
  /** On recovery discard */
  onRecoveryDiscard?: () => void;
  /** On create checkpoint */
  onCreateCheckpoint?: () => void;
  /** Recovery timestamp */
  recoveryTimestamp?: number;
  /** Recovery dialog open */
  recoveryDialogOpen?: boolean;
  /** On recovery dialog open */
  onRecoveryDialogOpen?: (open: boolean) => void;
  /** Import dialog open */
  importDialogOpen?: boolean;
  /** On import dialog open */
  onImportDialogOpen?: (open: boolean) => void;
  /** Help panel open */
  helpPanelOpen?: boolean;
  /** On help panel open */
  onHelpPanelOpen?: (open: boolean) => void;
  /** History panel open */
  historyPanelOpen?: boolean;
  /** On history panel open */
  onHistoryPanelOpen?: (open: boolean) => void;
  /** Class name */
  className?: string;
}

export const DraftingMenuBar: React.FC<DraftingMenuBarProps> = React.memo(({
  onNew,
  onOpen,
  onSave,
  onExportDXF,
  onExportJSON,
  onExportPDF,
  onImport,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onZoomToSelection,
  onToggleGrid,
  onToggleSnap,
  gridVisible = true,
  snapEnabled = true,
  canUndo = false,
  canRedo = false,
  hasSelection = false,
  onSelectAll: _onSelectAll,
  onSettings,
  onHelp,
  onValidate,
  onOptimize,
  isOptimizing = false,
  onRecoveryRestore,
  onRecoveryDiscard,
  onCreateCheckpoint,
  recoveryTimestamp,
  className = '',
}) => {
  const drafting = useDraftingContext();

  // Safe event handlers
  const handleNew = safeEventHandler(() => onNew?.(), 'DraftingMenuBar', 'new');
  const handleOpen = safeEventHandler(() => onOpen?.(), 'DraftingMenuBar', 'open');
  const handleSave = safeEventHandler(() => onSave?.(), 'DraftingMenuBar', 'save');
  const handleExportDXF = safeEventHandler(() => onExportDXF?.(), 'DraftingMenuBar', 'exportDXF');
  const handleExportJSON = safeEventHandler(() => onExportJSON?.(), 'DraftingMenuBar', 'exportJSON');
  const handleExportPDF = safeEventHandler(() => onExportPDF?.(), 'DraftingMenuBar', 'exportPDF');
  const handleImport = safeEventHandler(() => onImport?.(), 'DraftingMenuBar', 'import');
  const handleUndo = safeEventHandler(() => {
    if (onUndo) {
      onUndo();
    } else {
      drafting.undo();
    }
  }, 'DraftingMenuBar', 'undo');
  const handleRedo = safeEventHandler(() => {
    if (onRedo) {
      onRedo();
    } else {
      drafting.redo();
    }
  }, 'DraftingMenuBar', 'redo');
  const handleCut = safeEventHandler(() => {
    if (onCut) {
      onCut();
    } else {
      // Default cut: copy then delete
      try {
        const selectedElement = drafting.getSelectedElement();
        if (selectedElement !== null) {
          const geometry = drafting.getGeometry();
          const clipboardData = copyToClipboard(geometry, [selectedElement]);
          if (clipboardData) {
            drafting.deleteSelected();
            toast.success('Cut to clipboard');
          }
        } else {
          toast.warning('No element selected');
        }
      } catch (error) {
        toast.error('Failed to cut element');
        console.error('Cut error:', error);
      }
    }
  }, 'DraftingMenuBar', 'cut');

  const handleCopy = safeEventHandler(() => {
    if (onCopy) {
      onCopy();
    } else {
      // Default copy
      try {
        const selectedElement = drafting.getSelectedElement();
        if (selectedElement !== null) {
          const geometry = drafting.getGeometry();
          const clipboardData = copyToClipboard(geometry, [selectedElement]);
          if (clipboardData) {
            toast.success('Copied to clipboard');
          }
        } else {
          toast.warning('No element selected');
        }
      } catch (error) {
        toast.error('Failed to copy element');
        console.error('Copy error:', error);
      }
    }
  }, 'DraftingMenuBar', 'copy');

  const handlePaste = safeEventHandler(() => {
    if (onPaste) {
      onPaste();
    } else {
      // Default paste
      try {
        const clipboardData = getClipboardData();
        if (!clipboardData) {
          toast.error('Clipboard is empty');
          return;
        }

        const pasteGeometry = preparePasteGeometry(clipboardData);
        
        // Add pasted elements
        pasteGeometry.rectangles?.forEach(rect => drafting.addRectangle(rect));
        pasteGeometry.circles?.forEach(circle => drafting.addCircle(circle));
        pasteGeometry.lines?.forEach(line => drafting.addLine(line));
        pasteGeometry.arcs?.forEach(arc => drafting.addArc(arc));
        pasteGeometry.polygons?.forEach(polygon => drafting.addPolygon(polygon));

        toast.success('Pasted from clipboard');
      } catch (error) {
        toast.error('Failed to paste elements');
        console.error('Paste error:', error);
      }
    }
  }, 'DraftingMenuBar', 'paste');
  const handleDelete = safeEventHandler(() => {
    if (onDelete) {
      onDelete();
    } else {
      drafting.deleteSelected();
    }
  }, 'DraftingMenuBar', 'delete');
  const handleZoomIn = safeEventHandler(() => onZoomIn?.(), 'DraftingMenuBar', 'zoomIn');
  const handleZoomOut = safeEventHandler(() => onZoomOut?.(), 'DraftingMenuBar', 'zoomOut');
  const handleZoomToFit = safeEventHandler(() => onZoomToFit?.(), 'DraftingMenuBar', 'zoomToFit');
  const handleZoomToSelection = safeEventHandler(() => onZoomToSelection?.(), 'DraftingMenuBar', 'zoomToSelection');
  const handleToggleGrid = safeEventHandler(() => onToggleGrid?.(), 'DraftingMenuBar', 'toggleGrid');
  const handleToggleSnap = safeEventHandler(() => onToggleSnap?.(), 'DraftingMenuBar', 'toggleSnap');
  const handleValidate = safeEventHandler(() => onValidate?.(), 'DraftingMenuBar', 'validate');
  const handleOptimize = safeEventHandler(() => onOptimize?.(), 'DraftingMenuBar', 'optimize');
  const handleRecoveryRestore = safeEventHandler(() => onRecoveryRestore?.(), 'DraftingMenuBar', 'recoveryRestore');
  const handleRecoveryDiscard = safeEventHandler(() => onRecoveryDiscard?.(), 'DraftingMenuBar', 'recoveryDiscard');
  const handleCreateCheckpoint = safeEventHandler(() => onCreateCheckpoint?.(), 'DraftingMenuBar', 'createCheckpoint');

  const hasRecoveryPoint = Boolean(recoveryTimestamp);

  return (
    <div className={`h-10 border-b border-amber-600/30 bg-slate-950/95 backdrop-blur-sm flex items-center gap-1 px-3 ${className}`} style={{ marginTop: '-37.8px' }}>
      <ThemeToggle size="sm" variant="ghost" className="mr-2" />
      {/* File Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs font-medium text-amber-600/70 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            File
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-slate-900 border-amber-600/30">
          <DropdownMenuLabel className="text-amber-300">File</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-amber-600/20" />
          <EnhancedTooltip toolKey="new" placement="right" delay={200}>
            <DropdownMenuItem onClick={handleNew} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <FileText className="mr-2 h-4 w-4" />
              New
              <DropdownMenuShortcut>Ctrl+N</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="open" placement="right" delay={200}>
            <DropdownMenuItem onClick={handleOpen} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <FolderOpen className="mr-2 h-4 w-4" />
              Open
              <DropdownMenuShortcut>Ctrl+O</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="save" placement="right" delay={200}>
            <DropdownMenuItem onClick={handleSave} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <Save className="mr-2 h-4 w-4" />
              Save
              <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <DropdownMenuSeparator className="bg-amber-600/20" />
          <EnhancedTooltip toolKey="import" placement="right" delay={200}>
            <DropdownMenuItem onClick={handleImport} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <Upload className="mr-2 h-4 w-4" />
              Import
              <DropdownMenuShortcut>Ctrl+I</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="export-dxf" placement="right" delay={200}>
            <DropdownMenuItem onClick={handleExportDXF} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <Download className="mr-2 h-4 w-4" />
              Export DXF
              <DropdownMenuShortcut>Ctrl+E</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="export-json" placement="right" delay={200}>
            <DropdownMenuItem onClick={handleExportJSON} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="export-pdf" placement="right" delay={200}>
            <DropdownMenuItem onClick={handleExportPDF} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
              <DropdownMenuShortcut>Ctrl+Shift+P</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs font-medium text-amber-600/70 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-slate-900 border-amber-600/30">
          <DropdownMenuLabel className="text-amber-300">Edit</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-amber-600/20" />
          <EnhancedTooltip toolKey="undo" placement="right" delay={200}>
            <DropdownMenuItem 
              onClick={handleUndo} 
              disabled={!canUndo}
              className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Undo className="mr-2 h-4 w-4" />
              Undo
              <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="redo" placement="right" delay={200}>
            <DropdownMenuItem 
              onClick={handleRedo} 
              disabled={!canRedo}
              className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Redo className="mr-2 h-4 w-4" />
              Redo
              <DropdownMenuShortcut>Ctrl+Shift+Z</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <DropdownMenuSeparator className="bg-amber-600/20" />
          <EnhancedTooltip toolKey="cut" placement="right" delay={200}>
            <DropdownMenuItem 
              onClick={handleCut} 
              disabled={!hasSelection}
              className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Scissors className="mr-2 h-4 w-4" />
              Cut
              <DropdownMenuShortcut>Ctrl+X</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="copy" placement="right" delay={200}>
            <DropdownMenuItem 
              onClick={handleCopy} 
              disabled={!hasSelection}
              className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
              <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="paste" placement="right" delay={200}>
            <DropdownMenuItem 
              onClick={handlePaste}
              className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300"
            >
              <Clipboard className="mr-2 h-4 w-4" />
              Paste
              <DropdownMenuShortcut>Ctrl+V</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <DropdownMenuSeparator className="bg-amber-600/20" />
          <EnhancedTooltip toolKey="delete" placement="right" delay={200}>
            <DropdownMenuItem 
              onClick={handleDelete} 
              disabled={!hasSelection}
              className="text-slate-200 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
              <DropdownMenuShortcut>Del</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs font-medium text-amber-600/70 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            View
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-slate-900 border-amber-600/30">
          <DropdownMenuLabel className="text-amber-300">View</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-amber-600/20" />
          <EnhancedTooltip toolKey="zoom-in" placement="right" delay={200}>
            <DropdownMenuItem onClick={handleZoomIn} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <ZoomIn className="mr-2 h-4 w-4" />
              Zoom In
              <DropdownMenuShortcut>Ctrl++</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="zoom-out" placement="right" delay={200}>
            <DropdownMenuItem onClick={handleZoomOut} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <ZoomOut className="mr-2 h-4 w-4" />
              Zoom Out
              <DropdownMenuShortcut>Ctrl+-</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="zoom-to-fit" placement="right" delay={200}>
            <DropdownMenuItem onClick={handleZoomToFit} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <Maximize2 className="mr-2 h-4 w-4" />
              Zoom to Fit
              <DropdownMenuShortcut>Ctrl+0</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="zoom-to-selection" placement="right" delay={200}>
            <DropdownMenuItem 
              onClick={handleZoomToSelection} 
              disabled={!hasSelection}
              className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Maximize2 className="mr-2 h-4 w-4" />
              Zoom to Selection
              <DropdownMenuShortcut>Ctrl+Shift+0</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <DropdownMenuSeparator className="bg-amber-600/20" />
          <EnhancedTooltip toolKey="toggle-grid" placement="right" delay={200}>
            <DropdownMenuItem onClick={handleToggleGrid} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              {gridVisible ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Hide Grid
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Show Grid
                </>
              )}
              <DropdownMenuShortcut>G</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="toggle-snap" placement="right" delay={200}>
            <DropdownMenuItem onClick={handleToggleSnap} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <Grid3x3 className="mr-2 h-4 w-4" />
              {snapEnabled ? 'Disable' : 'Enable'} Snap
              <DropdownMenuShortcut>S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tools Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs font-medium text-amber-600/70 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            Tools
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-slate-900 border-amber-600/30">
          <DropdownMenuLabel className="text-amber-300">Tools</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-amber-600/20" />
          <EnhancedTooltip toolKey="validate" placement="right" delay={200}>
            <DropdownMenuItem
              onClick={handleValidate}
              className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Validate for Execution
              <DropdownMenuShortcut>Ctrl+Shift+V</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="optimize" placement="right" delay={200}>
            <DropdownMenuItem
              onClick={() => void handleOptimize()}
              disabled={isOptimizing}
              className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="mr-2 h-4 w-4" />
              Optimize Cutting Plan
            </DropdownMenuItem>
          </EnhancedTooltip>
          <DropdownMenuSeparator className="bg-amber-600/20" />
          <DropdownMenuLabel className="text-amber-300">Recovery</DropdownMenuLabel>
          <EnhancedTooltip toolKey="recovery-restore" placement="right" delay={200}>
            <DropdownMenuItem
              onClick={handleRecoveryRestore}
              disabled={!hasRecoveryPoint}
              className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore Recovery Point
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="recovery-discard" placement="right" delay={200}>
            <DropdownMenuItem
              onClick={handleRecoveryDiscard}
              disabled={!hasRecoveryPoint}
              className="text-slate-200 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Discard Recovery Point
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="create-checkpoint" placement="right" delay={200}>
            <DropdownMenuItem
              onClick={handleCreateCheckpoint}
              className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300"
            >
              <Wrench className="mr-2 h-4 w-4" />
              Create Checkpoint
            </DropdownMenuItem>
          </EnhancedTooltip>
          {onSettings && (
            <EnhancedTooltip toolKey="settings" placement="right" delay={200}>
              <DropdownMenuItem 
                onClick={onSettings}
                className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </EnhancedTooltip>
          )}
          <DropdownMenuSeparator className="bg-amber-600/20" />
          <DropdownMenuItem className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
            <Wrench className="mr-2 h-4 w-4" />
            Select Tool
            <DropdownMenuShortcut>V</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
            <Grid3x3 className="mr-2 h-4 w-4" />
            Rectangle Tool
            <DropdownMenuShortcut>R</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
            <Grid3x3 className="mr-2 h-4 w-4" />
            Circle Tool
            <DropdownMenuShortcut>C</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
            <Grid3x3 className="mr-2 h-4 w-4" />
            Line Tool
            <DropdownMenuShortcut>L</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-amber-600/20" />
          <DropdownMenuItem className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
            <Settings className="mr-2 h-4 w-4" />
            Settings
            <DropdownMenuShortcut>Ctrl+,</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Help Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs font-medium text-amber-600/70 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            Help
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-slate-900 border-amber-600/30">
          <DropdownMenuLabel className="text-amber-300">Help</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-amber-600/20" />
          <EnhancedTooltip toolKey="help-panel" placement="right" delay={200}>
            <DropdownMenuItem onClick={onHelp} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <BookOpen className="mr-2 h-4 w-4" />
              Help Panel
              <DropdownMenuShortcut>F1</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="documentation" placement="right" delay={200}>
            <DropdownMenuItem onClick={() => window.open('https://docs.almona.ai', '_blank')} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <HelpCircle className="mr-2 h-4 w-4" />
              Documentation
            </DropdownMenuItem>
          </EnhancedTooltip>
          <EnhancedTooltip toolKey="keyboard-shortcuts" placement="right" delay={200}>
            <DropdownMenuItem onClick={() => window.open('https://docs.almona.ai/shortcuts', '_blank')} className="text-slate-200 hover:bg-amber-500/10 hover:text-amber-300">
              <Keyboard className="mr-2 h-4 w-4" />
              Keyboard Shortcuts
              <DropdownMenuShortcut>?</DropdownMenuShortcut>
            </DropdownMenuItem>
          </EnhancedTooltip>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo - only re-render if relevant props change
  return (
    prevProps.gridVisible === nextProps.gridVisible &&
    prevProps.snapEnabled === nextProps.snapEnabled &&
    prevProps.canUndo === nextProps.canUndo &&
    prevProps.canRedo === nextProps.canRedo &&
    prevProps.hasSelection === nextProps.hasSelection &&
    prevProps.className === nextProps.className &&
    prevProps.onNew === nextProps.onNew &&
    prevProps.onOpen === nextProps.onOpen &&
    prevProps.onSave === nextProps.onSave &&
    prevProps.onExportDXF === nextProps.onExportDXF &&
    prevProps.onExportJSON === nextProps.onExportJSON &&
    prevProps.onExportPDF === nextProps.onExportPDF &&
    prevProps.onImport === nextProps.onImport &&
    prevProps.onUndo === nextProps.onUndo &&
    prevProps.onRedo === nextProps.onRedo &&
    prevProps.onCut === nextProps.onCut &&
    prevProps.onCopy === nextProps.onCopy &&
    prevProps.onPaste === nextProps.onPaste &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onZoomIn === nextProps.onZoomIn &&
    prevProps.onZoomOut === nextProps.onZoomOut &&
    prevProps.onZoomToFit === nextProps.onZoomToFit &&
    prevProps.onZoomToSelection === nextProps.onZoomToSelection &&
    prevProps.onToggleGrid === nextProps.onToggleGrid &&
    prevProps.onToggleSnap === nextProps.onToggleSnap &&
    prevProps.onValidate === nextProps.onValidate &&
    prevProps.onOptimize === nextProps.onOptimize &&
    prevProps.isOptimizing === nextProps.isOptimizing &&
    prevProps.onRecoveryRestore === nextProps.onRecoveryRestore &&
    prevProps.onRecoveryDiscard === nextProps.onRecoveryDiscard &&
    prevProps.onCreateCheckpoint === nextProps.onCreateCheckpoint &&
    prevProps.recoveryTimestamp === nextProps.recoveryTimestamp &&
    prevProps.onSettings === nextProps.onSettings &&
    prevProps.onHelp === nextProps.onHelp
  );
});

DraftingMenuBar.displayName = 'DraftingMenuBar';

export default DraftingMenuBar;

