/**
 * DraftingWorkbenchLayout - Main layout structure for the Drafting Workbench
 *
 * Provides the overall layout with:
 * - Top menu bar
 * - Main content area (tabs)
 * - Right panel with tools and properties
 * - Status bar at bottom
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';
import { DraftingToolbar } from '../DraftingToolbar';
import type { DraftingEngine } from '../hooks/useDraftingEngine';
import type { DraftingWorkbenchHandlers } from '../hooks/useDraftingWorkbenchHandlers';
import type { DraftingWorkbenchState, DraftingWorkbenchStateActions } from '../hooks/useDraftingWorkbenchState';
import { formatZoomLevel } from '../utils/viewportUtils';
import { DraftingMenuBar } from './DraftingMenuBar';
import { EnhancedStatusBar } from './EnhancedStatusBar';

interface DraftingWorkbenchLayoutProps {
  state: DraftingWorkbenchState;
  actions: DraftingWorkbenchStateActions;
  handlers: DraftingWorkbenchHandlers;
  draftingEngine: DraftingEngine;
  mainContent: React.ReactNode;
  rightPanel: React.ReactNode;
}

export const DraftingWorkbenchLayout: React.FC<DraftingWorkbenchLayoutProps> = ({
  state,
  actions,
  handlers,
  draftingEngine,
  mainContent,
  rightPanel,
}) => {
  const handleNew = useCallback(() => {
    draftingEngine.clearSelection();
    // TODO: Add toast notification when toast is available
  }, [draftingEngine]);

  const handleHelp = useCallback(() => {
    actions.setHelpPanelOpen(true);
  }, [actions]);

  const handleValidate = useCallback(() => {
    void handlers.handleValidateForExecution();
  }, [handlers]);

  // Calculate element count
  const elementCount = useMemo(() => {
    try {
      const geometry = draftingEngine.getGeometry();
      return geometry.rectangles.length + 
             geometry.circles.length + 
             geometry.lines.length + 
             geometry.arcs.length + 
             geometry.polygons.length +
             geometry.splines.length;
    } catch {
      return 0;
    }
  }, [draftingEngine]);

  // Format zoom level
  const zoomLevel = useMemo(() => {
    return formatZoomLevel(state.ui.viewport);
  }, [state.ui.viewport]);

  return (
    <div className="h-full w-full flex flex-col bg-[#1a1a1a] text-slate-200 overflow-hidden">
      {/* Top Menu Bar */}
      <div className="flex-shrink-0 border-b border-slate-700/50">
        <DraftingMenuBar
          onNew={handleNew}
          onOpen={handlers.handleLoadWithDialog}
          onHelp={handleHelp}
          onSave={handlers.handleSave}
          onExportDXF={handlers.handleExportDXF}
          onExportJSON={handlers.handleExportJSON}
          onExportPDF={handlers.handleExportPDF}
          onImport={() => actions.setImportDialogOpen(true)}
          onUndo={draftingEngine.undo}
          onRedo={draftingEngine.redo}
          canUndo={draftingEngine.canUndo()}
          canRedo={draftingEngine.canRedo()}
          hasSelection={draftingEngine.getSelectedElement() !== null}
          onToggleGrid={handlers.handleGridToggle}
          onToggleSnap={handlers.handleSnapToggle}
          gridVisible={state.preferences.gridVisible}
          snapEnabled={state.preferences.snapEnabled}
          onValidate={handleValidate}
          onOptimize={() => void handlers.handleOptimize()}
          isOptimizing={state.operations.isOptimizing}
          onRecoveryRestore={handlers.handleRecoveryRestore}
          onRecoveryDiscard={handlers.handleRecoveryDiscard}
          onCreateCheckpoint={handlers.handleCreateCheckpoint}
          recoveryTimestamp={state.recovery.recoveryTimestamp}
          recoveryDialogOpen={state.ui.recoveryDialogOpen}
          onRecoveryDialogOpen={actions.setRecoveryDialogOpen}
          importDialogOpen={state.ui.importDialogOpen}
          onImportDialogOpen={actions.setImportDialogOpen}
          helpPanelOpen={state.ui.helpPanelOpen}
          onHelpPanelOpen={actions.setHelpPanelOpen}
          historyPanelOpen={state.ui.historyPanelOpen}
          onHistoryPanelOpen={actions.setHistoryPanelOpen}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel - Toolbar */}
        <div className="w-14 flex-shrink-0 border-r border-slate-700/50 bg-slate-900 overflow-y-auto overflow-x-hidden">
          <DraftingToolbar
            selectedTool={state.ui.selectedTool}
            onToolSelect={actions.setSelectedTool}
          />
        </div>

        {/* Main Content (Tabs) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {mainContent}
        </div>

        {/* Right Panel */}
        <div className={`relative flex-shrink-0 min-h-0 border-l border-slate-700/50 bg-slate-900 overflow-hidden transition-all duration-300 ease-in-out ${
          state.ui.rightPanelCollapsed ? 'w-0' : 'w-80'
        }`}>
          <div className="h-full min-h-0 flex flex-col w-full">
              {rightPanel}
          </div>
        </div>

        {/* Collapse/Expand Component - Absolute positioned relative to the main container */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 transition-all duration-300 ease-in-out pointer-events-none" 
             style={{ right: state.ui.rightPanelCollapsed ? '0' : '320px' }}>
             
             {/* Use pointer-events-auto to make the button clickable */}
             <button
                onClick={() => actions.setRightPanelCollapsed(!state.ui.rightPanelCollapsed)}
                className="pointer-events-auto h-12 w-6 bg-slate-800 border-l border-t border-b border-slate-700/50 rounded-l-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors shadow-md"
                aria-label={state.ui.rightPanelCollapsed ? "Expand right panel" : "Collapse right panel"}
                title={state.ui.rightPanelCollapsed ? "Expand panel" : "Collapse panel"}
              >
                {state.ui.rightPanelCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="flex-shrink-0 border-t border-slate-700/50 bg-slate-900">
        <EnhancedStatusBar
          operationStatus={state.operations.operationStatus}
          messages={state.operations.statusMessages}
          progress={state.operations.operationProgress}
          currentTool={state.ui.selectedTool}
          elementCount={elementCount}
          coordinates={state.recovery.mouseCoordinates}
          gridVisible={state.preferences.gridVisible}
          snapEnabled={state.preferences.snapEnabled}
          zoomLevel={zoomLevel}
          onDismissMessage={handlers.handleDismissMessage}
          onHelp={handleHelp}
        />
      </div>
    </div>
  );
};