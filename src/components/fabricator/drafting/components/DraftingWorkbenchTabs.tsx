/**
 * DraftingWorkbenchTabs - Tab navigation and content for the main drafting area
 *
 * Handles the 2D, 3D, Validation, and Templates tabs with their respective content.
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import type { Profile, WindowUnit } from '@/types/fabricator';
import { Box, Grid3x3, Sparkles } from 'lucide-react';
import React, { Suspense, lazy } from 'react';
import type { DraftingEngine } from '../hooks/useDraftingEngine';
import type { DraftingWorkbenchState, DraftingWorkbenchStateActions } from '../hooks/useDraftingWorkbenchState';
import { convertDraftingToWindowGrid } from '../utils/draftingToWindowGrid';

// Lazy load components
const DraftingCanvas2D = lazy(() => import('../DraftingCanvas2D').then(m => ({ default: m.DraftingCanvas2D })));
const DraftingPreview3D = lazy(() => import('../DraftingPreview3D').then(m => ({ default: m.DraftingPreview3D })));
const DraftingValidationGate = lazy(() => import('../DraftingValidationGate').then(m => ({ default: m.DraftingValidationGate })));
const TemplateEditor = lazy(() => import('./TemplateEditor').then(m => ({ default: m.TemplateEditor })));

interface DraftingWorkbenchTabsProps {
  state: DraftingWorkbenchState;
  actions: DraftingWorkbenchStateActions;
  draftingEngine: DraftingEngine;
  profiles: Profile[];
  collaboration: {
    users: Array<{ id: string; name?: string }>;
    broadcastSelection: (selection: unknown) => void;
  };
  onMoveToNext?: () => void;
  onOpenPoseQuickEdit?: () => void;
  handlers: {
    handleCursorMove: (pos: { x: number; y: number }) => void;
    handleGridToggle: () => void;
    handleSnapToggle: () => void;
  };
}

export const DraftingWorkbenchTabs: React.FC<DraftingWorkbenchTabsProps> = ({
  state,
  actions,
  draftingEngine,
  profiles,
  collaboration,
  onMoveToNext,
  onOpenPoseQuickEdit,
  handlers,
}) => {
  return (
    <Tabs
      value={state.ui.activeTab}
      onValueChange={(value) => actions.setActiveTab(value as typeof state.ui.activeTab)}
      className="flex-1 flex flex-col min-h-0"
    >
      {/* Tab Navigation */}
      <div className="border-b border-slate-700/50 bg-slate-900 flex-shrink-0">
        <TabsList className="mx-0 px-2 h-8 border-0 bg-transparent gap-1">
          <TabsTrigger
            value="2d"
            className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-slate-500"
          >
            <Grid3x3 size={14} />
            2D Drafting
          </TabsTrigger>
          <TabsTrigger
            value="3d"
            className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-slate-500"
          >
            <Box size={14} />
            3D Preview
          </TabsTrigger>
          <TabsTrigger
            value="validation"
            className="px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-slate-500"
          >
            Validation
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="flex items-center gap-1.5 px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none border-b-2 border-transparent data-[state=active]:border-slate-500"
          >
            <Sparkles size={14} />
            Template Editor
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Tab Content */}
      <TabsContent value="2d" className="flex-1 overflow-hidden m-0 p-0 relative">
        <DraftingCanvas2D
          selectedTool={state.ui.selectedTool}
          onToolSelect={actions.setSelectedTool}
          selectedMaterial={state.preferences.selectedMaterial}
          selectedSystemPackId={state.preferences.selectedSystemPackId}
          viewport={state.ui.viewport}
          onViewportChange={actions.setViewport}
          operationStatus={state.operations.operationStatus}
          onOperationStatusChange={actions.setOperationStatus}
          statusMessages={state.operations.statusMessages}
          onStatusMessageAdd={(msg) => actions.setStatusMessages(prev => [...prev, msg].slice(-10))}
          operationProgress={state.operations.operationProgress}
          onOperationProgressChange={actions.setOperationProgress}
          collaborativeUsers={collaboration.users}
          currentUserId={state.collaboration.userId}
          onMousePositionChange={handlers.handleCursorMove}
          onSelectionChange={collaboration.broadcastSelection}
          snapSpacing={state.preferences.snapSpacing}
          gridVisible={state.preferences.gridVisible}
          snapEnabled={state.preferences.snapEnabled}
          onGridToggle={handlers.handleGridToggle}
          onSnapToggle={handlers.handleSnapToggle}
          onMoveToNext={onMoveToNext}
          onOpenPoseQuickEdit={onOpenPoseQuickEdit}
        />
      </TabsContent>

      <TabsContent value="3d" className="flex-1 overflow-hidden m-0 p-0">
        <DraftingPreview3D
          selectedMaterial={state.preferences.selectedMaterial}
          selectedSystemPackId={state.preferences.selectedSystemPackId}
          profiles={profiles}
          color="white"
        />
      </TabsContent>

      <TabsContent value="validation" className="flex-1 overflow-auto m-0 p-4">
        <DraftingValidationGate
          result={state.operations.validationResult}
          onFixIssues={() => {
            actions.setActiveTab('2d');
            if (state.operations.validationResult?.issues) {
              draftingEngine.highlightIssues(state.operations.validationResult.issues);
            }
          }}
        />
      </TabsContent>

      <TabsContent value="templates" className="flex-1 overflow-y-auto overflow-x-hidden m-0">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2"></div>
              <p className="text-sm">Loading template editor...</p>
            </div>
          </div>
        }>
          <TemplateEditor
            currentDesign={React.useMemo(() => {
              const geometry = draftingEngine.getGeometry();
              const activeTemplate = draftingEngine.getActiveTemplate();
              const template = draftingEngine.getAvailableTemplates().find(t => t.id === activeTemplate);

              if (!template || geometry.rectangles.length === 0) {
                return undefined;
              }

              const grid = convertDraftingToWindowGrid(geometry, template);
              const rects = geometry.rectangles;
              const totalWidth = Math.max(...rects.map(r => r.x + r.width)) - Math.min(...rects.map(r => r.x));
              const totalHeight = Math.max(...rects.map(r => r.y + r.height)) - Math.min(...rects.map(r => r.y));

              const windowUnit: WindowUnit = {
                id: `draft-${Date.now()}`,
                orderNumber: 'DRAFT',
                posNumber: 'DRAFT-001',
                type: 'draft',
                components: [],
                overallWidth: totalWidth || 1800,
                overallHeight: totalHeight || 1500,
                color: 'white',
                glazing: {},
                hardware: [],
                status: 'design',
                optimization: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                grid,
                systemPackId: state.preferences.selectedSystemPackId
              };

              return windowUnit;
            }, [draftingEngine, state.preferences.selectedSystemPackId])}
            onTemplateCreated={(template) => {
              if (import.meta.env.DEV) {
                console.debug('Template created:', template);
              }
              // TODO: Add toast notification
            }}
            onTemplateSelected={(template) => {
              draftingEngine.setTemplate(template.id);
              actions.setActiveTab('2d');
            }}
          />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
};