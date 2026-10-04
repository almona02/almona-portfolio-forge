/**
 * Studio Layout Architecture - Almona Fabricator Pro
 *
 * Industrial cockpit shell (FP-025A). Canonical routes unchanged.
 * AICS-001: presentation only — no manufacturing execution in this layout.
 */

import { ActiveProjectHeader } from '@/components/fabricator/shell/ActiveProjectHeader';
import { FabricatorWorkflowBar } from '@/components/fabricator/shell/FabricatorWorkflowBar';
import { ManufacturingStatusBar } from '@/components/fabricator/shell/ManufacturingStatusBar';
import { UniversalNavSidebar } from '@/components/fabricator/layout/UniversalNavSidebar';
import { useAuth } from '@/context/AuthContext';
import { useActiveStudioProject } from '@/hooks/fabricator/useActiveStudioProject';
import { useNarrowStudioShell } from '@/hooks/useNarrowStudioShell';
import { isRTL } from '@/lib/i18n';
import { FabricatorContextProvider } from '@/contexts/FabricatorContextProvider';
import { useFabricatorUIStore } from '@/stores/fabricatorUIStore';
import { Menu, Shield, Wifi } from 'lucide-react';
import React, { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface StudioLayoutProps {
  studioId?: 'command' | 'project' | 'design' | 'production' | 'data';
}

export const StudioLayout: React.FC<StudioLayoutProps> = ({ studioId }) => {
  const location = useLocation();
  const { user, supabaseUser, loading } = useAuth();
  const { i18n } = useTranslation('fabricator');
  const rtl = isRTL(i18n.language);
  const project = useActiveStudioProject();
  const narrow = useNarrowStudioShell();
  const togglePanel = useFabricatorUIStore((s) => s.togglePanel);
  const navCollapsed = useFabricatorUIStore((s) => s.panelStates.navigation.leftCollapsed);

  const activeStudio = studioId || location.pathname.split('/')[3] || 'command';

  if (loading) {
    return <StudioLoadingScreen />;
  }
  if (!user && !supabaseUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <FabricatorContextProvider>
      <div
        className="flex h-screen w-screen overflow-hidden bg-[#0a0a0a] text-amber-200 font-sans selection:bg-amber-900 selection:text-white"
        dir={rtl ? 'rtl' : 'ltr'}
        data-testid="fabricator-studio-shell"
        data-shell-narrow={narrow ? 'true' : 'false'}
      >
        <UniversalNavSidebar activeStudio={activeStudio} />

        <div className="flex-1 flex flex-col relative overflow-hidden min-w-0">
          <header className="min-h-14 border-b border-amber-600/30 flex flex-col gap-1.5 px-3 sm:px-4 py-2 bg-[#0a0a0a] z-20">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
                {narrow && (
                  <button
                    type="button"
                    onClick={() => togglePanel('navigation', 'left')}
                    className="p-2 -ms-1 rounded-md border border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                    aria-label={navCollapsed ? 'Open navigation' : 'Close navigation'}
                    aria-expanded={!navCollapsed}
                    data-testid="studio-nav-menu"
                  >
                    <Menu size={18} />
                  </button>
                )}
                <span className="text-sm font-semibold tracking-[0.2em] text-amber-300 uppercase">
                  ALMONA
                </span>
                <span className="text-[10px] font-mono text-amber-700 uppercase tracking-widest hidden sm:inline truncate">
                  {activeStudio} studio
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 text-[10px] font-medium text-amber-600/80 flex-shrink-0">
                <div className="flex items-center gap-1" title="Connectivity">
                  <Wifi className="w-3 h-3 text-emerald-500" aria-hidden />
                  <span className="hidden xs:inline sm:inline">YDT</span>
                </div>
                <div className="flex items-center gap-1" title="Constitutional guardrails">
                  <Shield className="w-3 h-3 text-amber-500" aria-hidden />
                  <span className="hidden sm:inline">Shield</span>
                </div>
              </div>
            </div>
            <ActiveProjectHeader
              project={project}
              compact={narrow}
              className="min-w-0 w-full"
            />
          </header>

          <FabricatorWorkflowBar />

          <main className="flex-1 overflow-hidden relative min-h-0">
            <div className="h-full w-full overflow-hidden">
              <Suspense fallback={<StudioLoadingScreen />}>
                <Outlet />
              </Suspense>
            </div>
          </main>

          <ManufacturingStatusBar />
        </div>
      </div>
    </FabricatorContextProvider>
  );
};

const StudioLoadingScreen = () => (
  <div className="flex items-center justify-center h-full w-full bg-[#0a0a0a]">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
      <div className="text-amber-500 font-mono text-sm">INITIALIZING STUDIO ENV...</div>
    </div>
  </div>
);

export default StudioLayout;
