/**
 * FP-028 / P5.5 — Canvas-primary Engineering Bay workbench.
 * Rails respond to measured shell width. Preview stays on one persistent host so
 * layout-only transitions (inline ↔ overlay, collapse) do not remount R3F.
 */
import { CollapsiblePanel } from '@/components/fabricator/layout/CollapsiblePanel';
import { useContainerSize } from '@/hooks/useContainerSize';
import { getEngineeringBayLayoutPolicy } from '@/lib/fabricator/engineering/engineeringBayLayout';
import {
  ENGINEERING_BAY_PREVIEW_RAIL_PX,
  resolveShellRailMode,
} from '@/lib/fabricator/layout/viewportChromePolicy';
import { cn } from '@/lib/utils';
import { Box, Settings } from 'lucide-react';
import React from 'react';

export interface EngineeringBayWorkbenchLayoutProps {
  mobileTab: 'design' | '3d';
  controls: React.ReactNode;
  canvas: React.ReactNode;
  preview: React.ReactNode;
}

export const EngineeringBayWorkbenchLayout: React.FC<EngineeringBayWorkbenchLayoutProps> = ({
  mobileTab,
  controls,
  canvas,
  preview,
}) => {
  const policy = getEngineeringBayLayoutPolicy();
  const { ref, size } = useContainerSize<HTMLDivElement>();
  const railMode = resolveShellRailMode(size.width);
  const useInlineRails = railMode === 'inline' || railMode === 'collapse-left';
  const showMobileDesign = !useInlineRails && mobileTab === 'design';

  return (
    <div
      ref={ref}
      className="w-full min-h-0"
      data-testid="engineering-bay-shell"
      data-container-width={size.width ?? undefined}
      data-rail-mode={railMode}
    >
      <div
        className={cn(
          'min-h-[640px] rounded-lg border border-gray-800/80 overflow-hidden bg-gray-950/40',
          useInlineRails ? 'flex' : 'flex flex-col',
        )}
        data-testid="engineering-bay-layout"
        data-primary-region={policy.primaryRegion}
      >
        {useInlineRails ? (
          <CollapsiblePanel
            position="left"
            sectionId={policy.sectionId}
            title={policy.leftPanelTitle}
            icon={<Settings className="h-4 w-4" />}
            widthExpanded={railMode === 'collapse-left' ? 220 : 300}
            widthCollapsed={48}
            resizable
            className="bg-gray-900/80"
          >
            <div className="p-3 space-y-4 overflow-y-auto">{controls}</div>
          </CollapsiblePanel>
        ) : null}

        {useInlineRails ? (
          <main
            role="main"
            aria-label={policy.canvasLandmarkLabel}
            className="flex-1 min-w-0 overflow-auto p-3"
            data-testid="engineering-bay-canvas-primary"
          >
            {canvas}
          </main>
        ) : null}

        {showMobileDesign ? (
          <div className="space-y-6 p-3" data-testid="engineering-bay-layout-mobile">
            <div className="space-y-6">{controls}</div>
            <div>{canvas}</div>
          </div>
        ) : null}

        {/*
          Persistent preview host: same CollapsiblePanel instance for docked + overlay.
          Collapse/hide via panel state — children stay mounted (see CollapsiblePanel).
        */}
        <div
          data-testid="engineering-bay-preview-host"
          className={cn('min-h-0', useInlineRails ? '' : 'min-h-[420px]')}
        >
          <CollapsiblePanel
            position="right"
            sectionId={policy.sectionId}
            title={policy.rightPanelTitle}
            icon={<Box className="h-4 w-4" />}
            widthExpanded={ENGINEERING_BAY_PREVIEW_RAIL_PX}
            widthCollapsed={48}
            variant={useInlineRails ? 'docked' : 'overlay'}
            className="bg-gray-900/80 h-full"
          >
            <div className="h-full min-h-[380px] p-3 space-y-4 overflow-y-auto">{preview}</div>
          </CollapsiblePanel>
        </div>
      </div>
    </div>
  );
};
