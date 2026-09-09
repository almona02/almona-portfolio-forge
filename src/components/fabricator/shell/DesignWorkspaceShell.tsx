import { isCadDesktopLayout, useStudioBreakpoint } from '@/hooks/useStudioBreakpoint';
import { isRTL } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/ui/sheet';
import { PanelLeft, PanelRight } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DesktopWorkspaceNotice } from './DesktopWorkspaceNotice';
import { EngineeringInspector, type InspectorSelectionKind } from './EngineeringInspector';
import { ProjectPositionNavigator } from './ProjectPositionNavigator';
import type { WindowUnit } from '@/types/fabricator';

export interface DesignWorkspaceShellProps {
  positions: WindowUnit[];
  project: WindowUnit | null;
  onSelectPosition: (id: string) => void;
  onAddPosition?: () => void;
  selectionKind?: InspectorSelectionKind;
  children: React.ReactNode;
  /** When true, right inspector is omitted (DraftingWorkbench already has one). */
  hideOuterInspector?: boolean;
}

export const DesignWorkspaceShell: React.FC<DesignWorkspaceShellProps> = ({
  positions,
  project,
  onSelectPosition,
  onAddPosition,
  selectionKind = 'pose',
  children,
  hideOuterInspector = false,
}) => {
  const bp = useStudioBreakpoint();
  const { t, i18n } = useTranslation('fabricator');
  const rtl = isRTL(i18n.language);
  const cadOk = isCadDesktopLayout(bp);
  const [navOpen, setNavOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNavOpen(false);
        setInspectorOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);
  const toggleInspector = useCallback(() => setInspectorOpen((v) => !v), []);

  const nav = (
    <ProjectPositionNavigator
      positions={positions}
      activeId={project?.id}
      onSelect={(id) => {
        onSelectPosition(id);
        setNavOpen(false);
      }}
      onAdd={onAddPosition}
    />
  );

  const inspector = (
    <EngineeringInspector project={project} selectionKind={selectionKind} />
  );

  if (bp === 'mobile') {
    return (
      <div className="h-full flex flex-col" data-testid="design-workspace-shell" data-breakpoint="mobile">
        <DesktopWorkspaceNotice feature={t('industrial.stages.design', 'Design')} />
      </div>
    );
  }

  const showInlineRails = bp === 'desktop';
  const collapseLeft = bp === 'laptop';

  return (
    <div
      className="h-full w-full flex min-h-0 overflow-hidden"
      data-testid="design-workspace-shell"
      data-breakpoint={bp}
    >
      {showInlineRails && (
        <div className="w-56 flex-shrink-0 border-e border-amber-600/20 min-h-0">
          {nav}
        </div>
      )}

      {collapseLeft && (
        <button
          type="button"
          onClick={toggleNav}
          className="w-8 flex-shrink-0 border-e border-amber-600/20 flex items-start justify-center pt-3 text-amber-500 hover:bg-amber-500/10"
          aria-label={t('industrial.positions.open', 'Open positions')}
          aria-expanded={navOpen}
        >
          <PanelLeft size={16} />
        </button>
      )}

      {bp === 'tablet' && (
        <button
          type="button"
          onClick={toggleNav}
          className="w-8 flex-shrink-0 border-e border-amber-600/20 flex items-start justify-center pt-3 text-amber-500 hover:bg-amber-500/10"
          aria-label={t('industrial.positions.open', 'Open positions')}
          aria-expanded={navOpen}
        >
          <PanelLeft size={16} />
        </button>
      )}

      <div className={cn('flex-1 min-w-0 min-h-0', !cadOk && 'overflow-auto')}>
        {cadOk ? children : <DesktopWorkspaceNotice />}
      </div>

      {!hideOuterInspector && showInlineRails && (
        <div className="w-72 flex-shrink-0 border-s border-amber-600/20 min-h-0">
          {inspector}
        </div>
      )}

      {!hideOuterInspector && (bp === 'laptop' || bp === 'tablet') && (
        <button
          type="button"
          onClick={toggleInspector}
          className="w-8 flex-shrink-0 border-s border-amber-600/20 flex items-start justify-center pt-3 text-amber-500 hover:bg-amber-500/10"
          aria-label={t('industrial.inspector.open', 'Open inspector')}
          aria-expanded={inspectorOpen}
        >
          <PanelRight size={16} />
        </button>
      )}

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side={rtl ? 'right' : 'left'}
          className="w-72 p-0 bg-[#0d0d0d] border-amber-600/30"
        >
          <SheetHeader className="p-3 border-b border-amber-600/20">
            <SheetTitle className="text-amber-200 text-sm">
              {t('industrial.positions.title', 'Positions')}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {t('industrial.positions.search', 'Search positions')}
            </SheetDescription>
          </SheetHeader>
          <div className="h-[calc(100%-52px)]">{nav}</div>
        </SheetContent>
      </Sheet>

      {!hideOuterInspector && (
        <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
          <SheetContent
            side={rtl ? 'left' : 'right'}
            className="w-80 p-0 bg-[#0d0d0d] border-amber-600/30"
          >
            <SheetHeader className="p-3 border-b border-amber-600/20">
              <SheetTitle className="text-amber-200 text-sm">
                {t('industrial.inspector.title', 'Properties')}
              </SheetTitle>
              <SheetDescription className="sr-only">
                {t('industrial.inspector.title', 'Properties')}
              </SheetDescription>
            </SheetHeader>
            <div className="h-[calc(100%-52px)]">{inspector}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};
