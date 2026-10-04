/**
 * FP-028 / P5.5 — Canvas-primary Engineering Bay workbench.
 * Desktop: collapsible left/right rails; editable canvas is the primary region.
 */
import { CollapsiblePanel } from '@/components/fabricator/layout/CollapsiblePanel';
import { getEngineeringBayLayoutPolicy } from '@/lib/fabricator/engineering/engineeringBayLayout';
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

  return (
    <>
      {/* Desktop: canvas-primary with collapsible secondary rails */}
      <div
        className="hidden lg:flex min-h-[640px] rounded-lg border border-gray-800/80 overflow-hidden bg-gray-950/40"
        data-testid="engineering-bay-layout"
        data-primary-region={policy.primaryRegion}
      >
        <CollapsiblePanel
          position="left"
          sectionId={policy.sectionId}
          title={policy.leftPanelTitle}
          icon={<Settings className="h-4 w-4" />}
          widthExpanded={300}
          widthCollapsed={48}
          className="bg-gray-900/80"
        >
          <div className="p-3 space-y-4">{controls}</div>
        </CollapsiblePanel>

        <main
          role="main"
          aria-label={policy.canvasLandmarkLabel}
          className="flex-1 min-w-0 overflow-auto p-3"
          data-testid="engineering-bay-canvas-primary"
        >
          {canvas}
        </main>

        <CollapsiblePanel
          position="right"
          sectionId={policy.sectionId}
          title={policy.rightPanelTitle}
          icon={<Box className="h-4 w-4" />}
          widthExpanded={380}
          widthCollapsed={48}
          className="bg-gray-900/80"
        >
          <div className="p-3 space-y-4">{preview}</div>
        </CollapsiblePanel>
      </div>

      {/* Mobile / small: tab-driven stack (tabs owned by parent) */}
      <div className="lg:hidden space-y-6" data-testid="engineering-bay-layout-mobile">
        {mobileTab === 'design' && (
          <>
            <div className="space-y-6">{controls}</div>
            <div>{canvas}</div>
          </>
        )}
        {mobileTab === '3d' && <div>{preview}</div>}
      </div>
    </>
  );
};
