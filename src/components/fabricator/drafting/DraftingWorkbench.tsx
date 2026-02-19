// src/components/fabricator/drafting/DraftingWorkbench.tsx
import { useAuth } from '@/context/AuthContext';
import { FabricatorSectionProvider } from '@/contexts/FabricatorSectionContext';
import { Button } from '@/shared/ui/ui/button';
import type { Profile, WindowUnit } from '@/types/fabricator';
import React, { Suspense, lazy, useCallback, useState } from 'react';
// PHASE 2 IMPORT: Facade Editor
import { usePoseSync } from '@/hooks/fabricator/usePoseSync';
import { FacadeReportService } from '@/lib/exports/FacadeReportService';
import { FacadeModel } from '@/lib/facade/CurtainWallEngine';
import { useOutletContext } from 'react-router-dom';
import { ConstitutionalTopBar, ConstitutionalTopBarCompact } from '../constitutional/ConstitutionalTopBar';
import { FacadeGridEditor } from '../facade/FacadeGridEditor';
import { DraftingContext } from './DraftingContext';
import { DraftListDialog } from './components/DraftListDialog';
import { DraftingErrorBoundary } from './components/DraftingErrorBoundary';
import { DraftingWorkbenchLayout } from './components/DraftingWorkbenchLayout';
import { DraftingWorkbenchPanels } from './components/DraftingWorkbenchPanels';
import { DraftingWorkbenchTabs } from './components/DraftingWorkbenchTabs';
import { RecoveryDialog } from './components/RecoveryDialog';
import { useCollaborativeDrafting } from './hooks/useCollaborativeDrafting';
import { useDraftingEngine } from './hooks/useDraftingEngine';
import { useDraftingWorkbenchHandlers } from './hooks/useDraftingWorkbenchHandlers';
import { useDraftingWorkbenchState } from './hooks/useDraftingWorkbenchState';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { DraftingOutput, DraftingState } from './types/drafting'; // Added types


// Lazy load panels for code splitting and performance optimization
// Unused panels removed for lint cleanliness
// const HelpPanel = lazy(...)
// const OperationHistoryPanel = lazy(...) 
// const BlockLibraryPanel = lazy(...)
// const TemplateEditor = lazy(...)

/**
 * DraftingWorkbench - Tier 0 High-Purity Drafting Component
 * 
 * Complies with ALMONA Constitutional Purity Standard AICS-001 (Tier 0).
 * Operation Mode: draftingOnly (Strictly visual drafting, no Tier 3 execution logic).
 */
const ImportDialog = lazy(() =>
  import('./components/ImportDialog').then(module => ({
    default: module.ImportDialog
  }))
);

export const DraftingWorkbench: React.FC<{
  onDesignValidated: (output: DraftingOutput) => void;
  initialTemplate?: string;
  profiles?: Profile[]; // Optional profiles for optimization
  onOptimizeRequest?: (windowUnit: WindowUnit) => void; // Optional callback for optimization
  onExit?: () => void;
  project?: WindowUnit; // Add project prop for constitutional display
  /** Save current design and advance to next pose (quick entry). */
  onMoveToNext?: () => void;
  /** Open pose quick-edit modal (profile color, quantity). */
  onOpenPoseQuickEdit?: () => void;
}> = ({ onDesignValidated, initialTemplate, profiles = [], onOptimizeRequest, onExit, project, onMoveToNext, onOpenPoseQuickEdit }) => {
  const { user } = useAuth();
  const { isCompactMode } = useOutletContext<{ isCompactMode?: boolean }>() || {};


  // Use consolidated state management hook
  // PHASE 2 STATE: Facade Mode
  const [mode, setMode] = useState<'window' | 'facade'>('window');
  const [facadeModel, setFacadeModel] = useState<FacadeModel | null>(null);

  const { state, actions } = useDraftingWorkbenchState();

  // Initialize drafting engine and collaboration
  const draftingEngine = useDraftingEngine({
    initialTemplate,
    onStateChange: useCallback((state: DraftingState) => {
      // Enhanced auto-save with versioning
      if (actions.persistenceManager) {
        actions.persistenceManager.saveState(state, false);
      }
    }, [actions])
  });

  // Constitutional state sync for drafting mode
  const { hasUnsavedChanges, metadata } = usePoseSync({
    poseId: project?.id || '',
    mode: 'drafting',
    currentState: state,
    autoSync: true,
    debounceMs: 500
  });

  // Collaborative drafting (must be defined before handleCursorMove)
  const collaboration = useCollaborativeDrafting({
    roomId: state.collaboration.roomId,
    userId: state.collaboration.userId,
    userName: 'User',
    enabled: false, // PILOT LOCKDOWN: Network Safety
    onStateUpdate: (_state) => {
      // Handle remote state updates (conflict resolution would go here)
      // Silently handle remote updates - no console logging in production
    }
  });

  // Use consolidated handlers hook
  const handlers = useDraftingWorkbenchHandlers({
    state,
    actions,
    draftingEngine,
    onDesignValidated,
    onOptimizeRequest,
    profiles,
    persistenceManager: actions.persistenceManager,
    collaboration,
  });
  // Removed unused elementCount calculation

  // Removed unused viewportBounds and activeStatusMessages memos

  // Log facade model to avoid unused variable warning (temporary)
  React.useEffect(() => {
    if (facadeModel) console.log('Facade Model Updated:', facadeModel);
  }, [facadeModel]);

  const handleFacadeReport = useCallback(async () => {
    if (!facadeModel) return;

    try {
      // Construct a minimal WindowUnit wrapper for the report
      const mockUnit: WindowUnit = {
        id: 'FACADE-' + Date.now(),
        orderNumber: `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
        customer: 'Valued Client',
        width: facadeModel.spec.width,
        height: facadeModel.spec.height,
        type: 'facade',
        quantity: 1,
        // Other fields would be populated from actual project context in a real app
        components: [],
        hardware: [],
        glazing: []
      } as unknown as WindowUnit;

      const blob = await FacadeReportService.generateFacadeReport(mockUnit, facadeModel);
      const { saveAs } = await import('file-saver');
      saveAs(blob, `Facade_Report_${mockUnit.orderNumber}.pdf`);
    } catch (error) {
      console.error("Report Generation Failed", error);
    }
  }, [facadeModel]);




  // Keyboard shortcuts
  useKeyboardShortcuts({
    draftingEngine,
    selectedTool: state.ui.selectedTool,
    onToolSelect: actions.setSelectedTool,
    onUndo: draftingEngine.undo,
    onRedo: draftingEngine.redo,
    onHelp: () => actions.setHelpPanelOpen(true),
    onViewportNavigate: handlers.handleViewportNavigate,
  });

  // Live system pack from first defined frame or selected pack (gold-tier: system pack branding next to Pose No)
  const liveSystemPackId = (() => {
    const mw = draftingEngine.getMaterialAwareWindows?.() ?? [];
    if (mw.length > 0) {
      const packId = (mw[0] as { systemPackId?: string }).systemPackId;
      if (packId) return packId;
    }
    return state.preferences.selectedSystemPackId || project?.systemPackId || undefined;
  })();

  // Live size from current drafting design (first frame or first rect) so top bar Size badge stays in sync
  const liveSize = (() => {
    const mw = draftingEngine.getMaterialAwareWindows?.() ?? [];
    if (mw.length > 0) {
      const first = mw[0] as { width?: number; height?: number };
      if (first.width != null && first.height != null) return { width: first.width, height: first.height };
    }
    const geom = draftingEngine.getGeometry();
    const rects = (geom?.rectangles ?? []) as { width?: number; height?: number }[];
    if (rects.length > 0 && rects[0]?.width != null && rects[0]?.height != null) {
      return { width: rects[0].width, height: rects[0].height };
    }
    return undefined;
  })();

  // Main content (tabs) and right panel content are now handled by extracted components
  const mainContent = React.useMemo(() => (
    <>
      {/* 9.2 Accessibility: Skip to Canvas */}
      <a
        href="#drawing-canvas"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-amber-500 focus:text-black focus:top-4 focus:left-4 focus:font-bold focus:shadow-xl focus:rounded-md transition-all"
      >
        Skip directly to Drawing Canvas
      </a>

      {/* Constitutional Top Bar */}
      {project && (
        <div className="mb-3">
          {isCompactMode ? (
            <ConstitutionalTopBarCompact
              project={project}
              liveSystemPackId={liveSystemPackId}
              mode="drafting"
              hasUnsavedChanges={hasUnsavedChanges}
            />
          ) : (
            <ConstitutionalTopBar
              project={project}
              liveSize={liveSize}
              liveSystemPackId={liveSystemPackId}
              mode="drafting"
              hasUnsavedChanges={hasUnsavedChanges}
              constitutionalStatus={{
                hash: metadata?.hash,
                timestamp: metadata?.timestamp,
                verified: true
              }}
            />
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-2 px-0">
        {/* Mode Switcher and Back Button */}
        <div className="flex items-center gap-2">
          {onExit && (
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1.5 h-8 text-xs text-slate-400 hover:text-white border border-slate-700/50 hover:bg-slate-800"
              onClick={onExit}
            >
              <span className="text-base pb-0.5">←</span>
              Back
            </Button>
          )}

          <div className="flex items-center gap-0.5 p-0.5 bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-lg shadow-inner">
            <button
              onClick={() => setMode('window')}
              className={`
               relative px-4 py-2 text-xs font-medium rounded-md transition-all duration-200
               ${mode === 'window'
                  ? 'text-slate-100 bg-slate-700 shadow-sm shadow-black/20'
                  : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'}
             `}
            >
              Window / Door
            </button>
            <div className="w-[1px] h-3 bg-slate-700/50 mx-0.5" />
            <button
              onClick={() => setMode('facade')}
              className={`
               relative px-4 py-2 text-xs font-medium rounded-md transition-all duration-200
               ${mode === 'facade'
                  ? 'text-amber-100 bg-amber-900/30 border border-amber-500/20 shadow-sm shadow-amber-900/10'
                  : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50'}
             `}
            >
              Curtain Wall (Facade)
            </button>
          </div>
        </div>

        {mode === 'facade' && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-8 text-xs gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-[0_0_15px_-3px_rgba(245,158,11,0.3)]"
            onClick={handleFacadeReport}
            disabled={!facadeModel}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            Generate Facade Report (PDF)
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 flex gap-4">
        {mode === 'window' ? (
          <>
            <DraftingWorkbenchTabs
              state={state}
              actions={actions}
              draftingEngine={draftingEngine}
              profiles={profiles}
              collaboration={collaboration}
              onMoveToNext={onMoveToNext}
              onOpenPoseQuickEdit={onOpenPoseQuickEdit}
              handlers={{
                handleCursorMove: handlers.handleCursorMove,
                handleGridToggle: handlers.handleGridToggle,
                handleSnapToggle: handlers.handleSnapToggle,
              }}
            />
          </>
        ) : (
          // PHASE 2: Facade Editor Mode
          <div className="flex-1">
            <FacadeGridEditor
              onModelChange={setFacadeModel}
            />
          </div>
        )}
      </div>
    </>
  ), [state, actions, draftingEngine, profiles, collaboration, handlers, mode, facadeModel, handleFacadeReport, onExit, project, hasUnsavedChanges, metadata, isCompactMode, onMoveToNext, onOpenPoseQuickEdit, liveSize, liveSystemPackId]);

  // Right panel content
  const rightPanelContent = React.useMemo(() => (
    <DraftingWorkbenchPanels
      state={state}
      actions={actions}
      draftingEngine={draftingEngine}
      profiles={profiles}
      onDesignValidated={onDesignValidated}
      projectId={project?.id}
    />
  ), [state, actions, draftingEngine, profiles, onDesignValidated, project?.id]);

  // Safety check for React availability (handles guest user context issues)
  // MOVED: Check at the end to avoid Hook violations
  if (typeof React === 'undefined' || !React) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <div className="text-center p-8">
          <div className="text-amber-400 text-lg font-semibold mb-4">
            Drafting Workbench Unavailable
          </div>
          <div className="text-slate-400 text-sm">
            This feature requires a valid session. Please refresh the page and try again.
          </div>
        </div>
      </div>
    );
  }

  return (
    <DraftingErrorBoundary level="component">
      <DraftingContext.Provider value={draftingEngine}>
        <FabricatorSectionProvider sectionId="drafting">
          <DraftingWorkbenchLayout
            state={state}
            actions={actions}
            handlers={handlers}
            draftingEngine={draftingEngine}
            mainContent={mainContent}
            rightPanel={rightPanelContent}
          />

          {/* Recovery Dialog - Keep outside layout */}
          <RecoveryDialog
            open={state.ui.recoveryDialogOpen}
            recoveryTimestamp={state.recovery.recoveryTimestamp}
            onRestore={handlers.handleRecoveryRestore}
            onDismiss={() => actions.setRecoveryDialogOpen(false)}
            onDiscard={handlers.handleRecoveryDiscard}
          />
        </FabricatorSectionProvider>
      </DraftingContext.Provider>

      {/* Import Dialog */}
      <Suspense fallback={null}>
        <ImportDialog
          open={state.ui.importDialogOpen}
          onOpenChange={actions.setImportDialogOpen}
          onImport={handlers.handleImport as (file: File, format: 'json' | 'dxf' | 'dwg') => Promise<void>}
          supportedFormats={['json', 'dxf']}
        />
      </Suspense>

      {/* Draft List Dialog */}
      <Suspense fallback={null}>
        <DraftListDialog
          open={state.ui.draftListDialogOpen}
          onOpenChange={actions.setDraftListDialogOpen}
          onSelectDraft={handlers.handleLoadDraft}
          onImportFile={() => {
            actions.setDraftListDialogOpen(false);
            actions.setImportDialogOpen(true);
          }}
          userId={user?.id || `guest-${Date.now()}`}
        />
      </Suspense>
    </DraftingErrorBoundary>
  );
};

