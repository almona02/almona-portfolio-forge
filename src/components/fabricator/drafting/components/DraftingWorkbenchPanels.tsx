/**
 * DraftingWorkbenchPanels - Right panel with tools and properties
 *
 * Contains various panels for:
 * - Properties and settings
 * - Template recommendations
 * - Manual template selection
 * - Dimensions display
 * - Constraint validation
 * - Geometry info
 * - Viewport controls
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import type { Profile, WindowGrid } from '@/types/fabricator';
import { DollarSign, Eye, Factory, Info, Layers, Package, Settings, Shield, Wrench } from 'lucide-react';
import React, { Suspense, lazy } from 'react';
import { DraftingValidationGate } from '../DraftingValidationGate';
import type { DraftingEngine } from '../hooks/useDraftingEngine';
import type { DraftingWorkbenchState, DraftingWorkbenchStateActions } from '../hooks/useDraftingWorkbenchState';
import { getGap, getMargin, getPadding } from '../styles/spacing';
import { getTypographyPreset } from '../styles/typography';
import type { DraftingOutput } from '../types/drafting';
import { convertDraftingToWindowGrid } from '../utils/draftingToWindowGrid';
import { getViewportBounds, getViewportPreset } from '../utils/viewportUtils';
import { SnapSpacingSelector } from './PropertiesPanel';
import { ViewportControls } from './ViewportControls';

// Lazy load components
const MaterialSystemSelector = lazy(() => import('../MaterialSystemSelector').then(m => ({ default: m.MaterialSystemSelector })));
const TemplateRecommendationPanel = lazy(() => import('../TemplateRecommendationPanel').then(m => ({ default: m.TemplateRecommendationPanel })));
const ConstraintValidationPanel = lazy(() => import('../ConstraintValidationPanel').then(m => ({ default: m.ConstraintValidationPanel })));
const LayerManagerPanel = lazy(() => import('./LayerManagerPanel').then(m => ({ default: m.LayerManagerPanel })));
const WasteMetricsPanel = lazy(() => import('./WasteMetricsPanel').then(m => ({ default: m.WasteMetricsPanel })));
const CuttingOptimizationEngine = lazy(() => import('../../production/CuttingOptimizationEngine').then(m => ({ default: m.CuttingOptimizationEngine })));
const BlockLibraryPanel = lazy(() => import('./BlockLibraryPanel').then(m => ({ default: m.BlockLibraryPanel })));
const PropertiesPanel = lazy(() => import('./PropertiesPanel').then(m => ({ default: m.PropertiesPanel })));
// const ProductionWorkflowPanel = lazy(() => import('./ProductionWorkflowPanel').then(m => ({ default: m.ProductionWorkflowPanel })));
const CutListPanel = lazy(() => import('./CutListPanel').then(m => ({ default: m.CutListPanel })));
const ExecutionTrackingPanel = lazy(() => import('./ExecutionTrackingPanel').then(m => ({ default: m.ExecutionTrackingPanel })));
const PricingPanel = lazy(() => import('./PricingPanel').then(m => ({ default: m.PricingPanel })));
const StockUsagePanel = lazy(() => import('./StockUsagePanel').then(m => ({ default: m.StockUsagePanel })));

interface DraftingWorkbenchPanelsProps {
  state: DraftingWorkbenchState;
  actions: DraftingWorkbenchStateActions;
  draftingEngine: DraftingEngine;
  profiles: Profile[];
  onDesignValidated?: (output: DraftingOutput) => void;
  projectId?: string;
}

export const DraftingWorkbenchPanels: React.FC<DraftingWorkbenchPanelsProps> = ({
  state,
  actions,
  draftingEngine,
  profiles,
  onDesignValidated,
  projectId = 'draft-' + Date.now(),
}) => {
  const availableTemplates = draftingEngine.getAvailableTemplates();
  const activeTemplate = draftingEngine.getActiveTemplate();
  const geometry = draftingEngine.getGeometry();
  const { lines, rectangles } = geometry;

  return (
    <div className="h-full min-h-0 flex flex-col">
      <Tabs defaultValue="properties" className="flex-1 min-h-0 flex flex-col">
        {/* Panel Tab Navigation */}
        <div className="border-b border-slate-600/50 bg-slate-900 flex-shrink-0">
          <TabsList className="mx-0 px-2 h-10 border-0 bg-transparent gap-1">
            <TabsTrigger
              value="properties"
              className="flex items-center gap-1 px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none"
            >
              <Settings size={14} />
              Props
            </TabsTrigger>
            <TabsTrigger
              value="layers"
              className="flex items-center gap-1 px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none"
            >
              <Layers size={14} />
              Layers
            </TabsTrigger>
            <TabsTrigger
              value="blocks"
              className="flex items-center gap-1 px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none"
            >
              <Wrench size={14} />
              Blocks
            </TabsTrigger>
            <TabsTrigger
              value="viewport"
              className="flex items-center gap-1 px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none"
            >
              <Eye size={14} />
              View
            </TabsTrigger>
            <TabsTrigger
              value="info"
              className="flex items-center gap-1 px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none"
            >
              <Info size={14} />
              Info
            </TabsTrigger>
            <TabsTrigger
              value="production"
              className="flex items-center gap-1 px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none"
            >
              <Factory size={14} />
              Production
            </TabsTrigger>
            <TabsTrigger
              value="execution"
              className="flex items-center gap-1 px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none"
            >
              <Wrench size={14} />
              Execution
            </TabsTrigger>
            <TabsTrigger
              value="quote"
              className="flex items-center gap-1 px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none"
            >
              <DollarSign size={14} />
              Quote
            </TabsTrigger>
            <TabsTrigger
              value="stock"
              className="flex items-center gap-1 px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none"
            >
              <Package size={14} />
              Stock
            </TabsTrigger>
            <TabsTrigger
              value="validation"
              className="flex items-center gap-1 px-3 h-8 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 data-[state=active]:shadow-none rounded-none"
            >
              <Shield size={14} />
              Validation
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Panel Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <TabsContent value="quote" className={`flex-1 overflow-auto m-0 ${getPadding('componentTight')}`}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-2"></div>
                  <p className="text-sm">Calculating estimate...</p>
                </div>
              </div>
            }>
              <PricingPanel
                rectangles={geometry.rectangles}
                systemId={state.preferences.selectedSystemPackId || 'alumil_m9660'}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="stock" className={`flex-1 overflow-auto m-0 ${getPadding('componentTight')}`}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-2"></div>
                  <p className="text-sm">Optimizing stock...</p>
                </div>
              </div>
            }>
              <StockUsagePanel
                rectangles={geometry.rectangles}
                systemId={state.preferences.selectedSystemPackId || 'alumil_m9660'}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="properties" className="flex-1 overflow-auto m-0 p-0">
            {/* Properties Panel - Element editing (position, dimensions, etc.) */}
            <Suspense fallback={
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2"></div>
                  <p className="text-sm">Loading properties...</p>
                </div>
              </div>
            }>
              <PropertiesPanel />
            </Suspense>

            {/* Material & System Selection */}
            <div className={`${getMargin('element')} ${getPadding('componentTight')} border-t border-slate-700/30`}>
              <Suspense fallback={
                <div className="flex items-center justify-center h-20 text-slate-400">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto mb-1"></div>
                    <p className="text-xs">Loading materials...</p>
                  </div>
                </div>
              }>
                <MaterialSystemSelector
                  selectedMaterial={state.preferences.selectedMaterial}
                  onMaterialChange={actions.setSelectedMaterial}
                  selectedSystemPackId={state.preferences.selectedSystemPackId}
                  onSystemPackChange={actions.setSelectedSystemPackId}
                />
              </Suspense>
            </div>

            {/* Template Selection (for 3D preview + grid-based tools) */}
            <div className={`${getMargin('element')} ${getPadding('componentTight')} border-t border-slate-700/30`}>
              <h3 className={`${getTypographyPreset('h3')} ${getMargin('elementTight')}`}>Template Selection</h3>
              <select
                value={activeTemplate}
                onChange={(e) => draftingEngine.setTemplate(e.target.value)}
                className={`w-full border rounded ${getPadding('input')} ${getTypographyPreset('bodySmall')}`}
                disabled={availableTemplates.length === 0}
              >
                <option value="">
                  {availableTemplates.length === 0 ? 'No templates available' : 'Select Template'}
                </option>
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.rows}x{template.cols})
                  </option>
                ))}
              </select>
              <p className={`${getTypographyPreset('caption')} text-slate-500 mt-2`}>
                Templates define the grid pattern used for 3D preview and optimization.
              </p>
            </div>

            {/* Real-time Waste Metrics */}
            {React.useMemo(() => {
              const geometry = draftingEngine.getGeometry();
              const template = availableTemplates.find(t => t.id === activeTemplate);

              if (!template || geometry.rectangles.length === 0) {
                return null;
              }

              const grid = convertDraftingToWindowGrid(geometry, template);

              return (
                <div className={`${getMargin('element')} ${getPadding('componentTight')}`}>
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-20 text-slate-400">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto mb-1"></div>
                        <p className="text-xs">Loading metrics...</p>
                      </div>
                    </div>
                  }>
                    <WasteMetricsPanel
                      geometry={geometry}
                      template={template}
                      grid={grid}
                      profiles={profiles}
                      systemPackId={state.preferences.selectedSystemPackId}
                    />
                  </Suspense>
                </div>
              );
              // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [
              lines,
              rectangles,
              availableTemplates,
              activeTemplate,
              profiles,
              state.preferences.selectedSystemPackId
            ])}
          </TabsContent>

          <TabsContent value="layers" className={`flex-1 overflow-auto m-0 ${getPadding('componentTight')}`}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2"></div>
                  <p className="text-sm">Loading layer manager...</p>
                </div>
              </div>
            }>
              <LayerManagerPanel />
            </Suspense>
          </TabsContent>

          <TabsContent value="blocks" className={`flex-1 overflow-auto m-0 ${getPadding('componentTight')}`}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2"></div>
                  <p className="text-sm">Loading block library...</p>
                </div>
              </div>
            }>
              <BlockLibraryPanel />
            </Suspense>
          </TabsContent>

          {/* Optimization Tab - only show if there's an optimization result */}
          {state.operations.optimizationResult && (
            <TabsContent value="optimization" className={`flex-1 overflow-auto m-0 ${getPadding('componentTight')}`}>
              <Suspense fallback={
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2"></div>
                    <p className="text-sm">Loading optimization...</p>
                  </div>
                </div>
              }>
                <CuttingOptimizationEngine
                  project={state.operations.optimizationWindowUnit}
                  optimization={state.operations.optimizationResult}
                  isGenerating={state.operations.isOptimizing}
                  profiles={profiles}
                />
              </Suspense>
            </TabsContent>
          )}

          <TabsContent value="viewport" className={`flex-1 overflow-auto m-0 p-0`}>
            <div className={`border-t border-slate-600/30 ${getPadding('componentTight')} overflow-y-auto max-h-full`}>
              {/* Snap Spacing Selector */}
              <div className={getMargin('elementTight')}>
                <SnapSpacingSelector
                  snapSpacing={state.preferences.snapSpacing}
                  onSnapSpacingChange={actions.setSnapSpacing}
                />
              </div>

              <ViewportControls
                viewport={state.ui.viewport}
                geometry={draftingEngine.getGeometry()}
                canvasWidth={2000}
                canvasHeight={1000}
                onViewportChange={actions.setViewport}
                onPresetSelect={(preset) => {
                  if (preset !== 'custom') {
                    const newViewport = getViewportPreset(
                      preset as 'fit' | '1:1' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
                      draftingEngine.getGeometry(),
                      2000,
                      1000,
                      state.ui.viewport
                    );
                    actions.setViewport(newViewport);
                  }
                }}
                onNavigate={(direction, amount) => {
                  const bounds = getViewportBounds(state.ui.viewport);
                  const viewportWidth = bounds.maxX - bounds.minX;
                  const viewportHeight = bounds.maxY - bounds.minY;
                  const moveAmount = (amount / 100) * (direction === 'left' || direction === 'right' ? viewportWidth : viewportHeight);

                  let newCenterX = state.ui.viewport.centerX;
                  let newCenterY = state.ui.viewport.centerY;

                  switch (direction) {
                    case 'left':
                      newCenterX -= moveAmount;
                      break;
                    case 'right':
                      newCenterX += moveAmount;
                      break;
                    case 'up':
                      newCenterY -= moveAmount;
                      break;
                    case 'down':
                      newCenterY += moveAmount;
                      break;
                  }

                  actions.setViewport((prev: any) => ({
                    ...prev,
                    centerX: newCenterX,
                    centerY: newCenterY
                  }));
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="info" className={`flex-1 overflow-auto m-0 ${getPadding('componentTight')}`}>
            <div className={getGap('tight')}>
              {/* Template Recommendations */}
              <div>
                <h3 className={`${getTypographyPreset('h3')} ${getMargin('elementTight')}`}>Template Recommendations</h3>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-20 text-slate-400">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto mb-1"></div>
                      <p className="text-xs">Loading recommendations...</p>
                    </div>
                  </div>
                }>
                  <TemplateRecommendationPanel />
                </Suspense>
              </div>

              {/* Manual Template Selection */}
              <div>
                <h3 className={`${getTypographyPreset('h3')} ${getMargin('elementTight')}`}>Manual Template Selection</h3>
                <select
                  value={draftingEngine.getActiveTemplate()}
                  onChange={(e) => draftingEngine.setTemplate(e.target.value)}
                  className={`w-full border rounded ${getPadding('input')} ${getTypographyPreset('bodySmall')}`}
                >
                  <option value="">Select Template</option>
                  {availableTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.rows}x{template.cols})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dimensions */}
              <div>
                <h3 className={`${getTypographyPreset('h3')} ${getMargin('elementTight')}`}>Dimensions</h3>
                {draftingEngine.getDimensions().length > 0 ? (
                  <div className={getGap('tight')}>
                    {draftingEngine.getDimensions().map((dim, i) => (
                      <div key={i} className={`flex justify-between ${getPadding('buttonSmall')}`}>
                        <span className={`${getTypographyPreset('bodySmall')} text-slate-400`}>{dim.label}</span>
                        <span className={`${getTypographyPreset('bodySmall')} font-mono font-medium text-amber-300`}>{dim.value}mm</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`${getTypographyPreset('caption')} text-slate-500 italic`}>No dimensions added yet</p>
                )}
              </div>

              {/* Constraint Validation */}
              <div>
                <h3 className={`${getTypographyPreset('h3')} ${getMargin('elementTight')}`}>Constraint Validation</h3>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-20 text-slate-400">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto mb-1"></div>
                      <p className="text-xs">Loading validation...</p>
                    </div>
                  </div>
                }>
                  <ConstraintValidationPanel
                    constraints={[
                      {
                        type: 'dimension',
                        property: 'width',
                        value: 10000,
                        operator: '<=',
                        message: 'Total width must not exceed 10m',
                      },
                      {
                        type: 'dimension',
                        property: 'height',
                        value: 10000,
                        operator: '<=',
                        message: 'Total height must not exceed 10m',
                      },
                      {
                        type: 'cell-size',
                        property: 'min-width',
                        value: 300,
                        operator: '>=',
                        message: 'Cell width must be at least 300mm',
                      },
                      {
                        type: 'cell-size',
                        property: 'min-height',
                        value: 300,
                        operator: '>=',
                        message: 'Cell height must be at least 300mm',
                      },
                    ]}
                  />
                </Suspense>
              </div>

              {/* Geometry Info */}
              <div>
                <h3 className={`${getTypographyPreset('h3')} ${getMargin('elementTight')}`}>Geometry Info</h3>
                <div className={getGap('tight')}>
                  <div className="flex justify-between">
                    <span className={`${getTypographyPreset('bodySmall')} text-slate-400`}>Rectangles:</span>
                    <span className={`${getTypographyPreset('bodySmall')} font-medium text-amber-300`}>{draftingEngine.getGeometry().rectangles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${getTypographyPreset('bodySmall')} text-slate-400`}>Lines:</span>
                    <span className={`${getTypographyPreset('bodySmall')} font-medium text-amber-300`}>{draftingEngine.getGeometry().lines.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${getTypographyPreset('bodySmall')} text-slate-400`}>Points:</span>
                    <span className={`${getTypographyPreset('bodySmall')} font-medium text-amber-300`}>{draftingEngine.getGeometry().points.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="production" className={`flex-1 overflow-auto m-0 ${getPadding('componentTight')}`}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2"></div>
                  <p className="text-sm">Loading production workflow...</p>
                </div>
              </div>
            }>
              {/* Integrated Cut List for Manual Workshops */}
              <CutListPanel
                rectangles={geometry.rectangles}
                systemId={state.preferences.selectedSystemPackId || 'alumil_m9660'}
              />
              {/* <ProductionWorkflowPanel /> */}
            </Suspense>
          </TabsContent>

          <TabsContent value="execution" className={`flex-1 overflow-auto m-0 ${getPadding('componentTight')}`}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2"></div>
                  <p className="text-sm">Loading execution tracking...</p>
                </div>
              </div>
            }>
              <ExecutionTrackingPanel projectId="" />
            </Suspense>
          </TabsContent>

          <TabsContent value="validation" className={`flex-1 overflow-auto m-0 ${getPadding('componentTight')}`}>
            {React.useMemo(() => {
              const geometry = draftingEngine.getGeometry();
              const template = availableTemplates.find(t => t.id === activeTemplate);

              // Calculate design dimensions from geometry bounds
              let width = 1200; // default
              let height = 1400; // default

              if (geometry.rectangles.length > 0) {
                const bounds = geometry.rectangles.reduce((acc, rect) => ({
                  minX: Math.min(acc.minX, rect.x),
                  minY: Math.min(acc.minY, rect.y),
                  maxX: Math.max(acc.maxX, rect.x + rect.width),
                  maxY: Math.max(acc.maxY, rect.y + rect.height)
                }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

                width = bounds.maxX - bounds.minX;
                height = bounds.maxY - bounds.minY;
              }

              // Create grid from template or default
              const grid: WindowGrid = template ? {
                rows: template.rows,
                cols: template.cols,
                cells: Array.from({ length: template.rows * template.cols }, (_, i) => ({
                  id: `cell-${i}`,
                  row: Math.floor(i / template.cols),
                  col: i % template.cols,
                  type: template.cellTypes[Math.floor(i / template.cols)]?.[i % template.cols] as any || 'fixed'
                }))
              } : {
                rows: 2,
                cols: 1,
                cells: [
                  { id: 'cell-0', row: 0, col: 0, type: 'fixed' },
                  { id: 'cell-1', row: 1, col: 0, type: 'sash' }
                ]
              };

              return (
                <DraftingValidationGate
                  designId={projectId}
                  geometry={geometry}
                  width={width}
                  height={height}
                  grid={grid}
                  systemId={state.preferences.selectedSystemPackId}
                  onValidationSuccess={(output) => {
                    console.log('[DraftingWorkbenchPanels] Design validated:', output);
                    if (onDesignValidated) {
                      onDesignValidated(output);
                    }
                  }}
                />
              );
            }, [
              draftingEngine,
              availableTemplates,
              activeTemplate,
              projectId,
              onDesignValidated,
              state.preferences.selectedSystemPackId
            ])}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};