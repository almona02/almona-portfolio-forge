import { LiveAnnouncerProvider } from '@/components/a11y/LiveAnnouncer';
import { AutoSaveIndicator } from '@/components/fabricator/AutoSaveIndicator';
import { WorkspaceSnapshotManager } from '@/components/fabricator/WorkspaceSnapshotManager';
import { WorkspaceTopNav } from '@/components/fabricator/WorkspaceTopNav';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { useAutoSave } from '@/hooks/useAutoSave';
import { isRTL } from '@/lib/i18n';
import { WorkspaceSyncService } from '@/lib/workspace/WorkspaceSyncService';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { Input } from '@/shared/ui/ui/input';
import { Search } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useLocation } from 'react-router-dom';

export const FabricatorWorkspaceLayout: React.FC = () => {
  const location = useLocation();
  const { state, dispatch } = useFabricatorWorkspace();
  const { branding: _branding } = useCompanyBranding();
  const { t, i18n } = useTranslation('fabricator');
  const isRTLMode = isRTL(i18n.language);
  const [searchQuery, setSearchQuery] = useState(state.globalSearchQuery || '');


  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    dispatch({ type: 'SET_GLOBAL_SEARCH', payload: value });
  };

  // Create save function for useAutoSave hook
  // Note: useAutoSave handles debouncing, so we use saveWithRecovery
  // (which uses the regular save method, not the debounced one)
  const saveFunction = useCallback(
    async (workspaceData: typeof state) => {
      const service = new WorkspaceSyncService('fabricator-workspace-v1');
      // Use saveWithRecovery for error handling and timestamp tracking
      // It calls saveWorkspaceSnapshot (non-debounced) internally
      return await service.saveWithRecovery(workspaceData);
    },
    []
  );

  // Use auto-save hook for status tracking
  const { isSaving, lastSaved, hasUnsavedChanges, manualSave } = useAutoSave(
    state,
    saveFunction,
    {
      delay: 3000,
      enabled: true,
      onSave: (result) => {
        if (result.success && result.timestamp) {
          dispatch({ type: 'MARK_SAVED', payload: result.timestamp });
        }
      }
    }
  );

  // Note: Navigation blocking for internal routes would require useBlocker (React Router v6.4+)
  // For now, we rely on beforeunload (handled by useAutoSave) for browser close/reload
  // Internal navigation warnings can be added per-component as needed

  // Phase 10: Collapsible Workflow (Focus Mode)
  const [isCompactMode, setIsCompactMode] = useState(false);

  return (
    <LiveAnnouncerProvider>
      <div className="min-h-screen bg-[#0a0a0a] relative flex flex-col">
        {/* Classical Textured Background */}
        <div className="fixed inset-0 opacity-20 pointer-events-none" style={{
          backgroundImage: `
          radial-gradient(circle at 2px 2px, rgba(245, 158, 11, 0.15) 1px, transparent 0),
          repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(245, 158, 11, 0.05) 2px, rgba(245, 158, 11, 0.05) 4px)
        `,
          backgroundSize: '40px 40px, 100px 100px'
        }} />

        {/* Workspace Top Navigation Bar */}
        <WorkspaceTopNav />

        {/* Workspace Header - Collapsible */}
        <div className={`
        border-b-2 border-amber-600/40 -sm transition-all duration-300 ease-in-out relative z-10 card-glass-dark
        ${isCompactMode ? 'pt-[var(--workspace-nav-height)] h-[var(--workspace-nav-height)] overflow-hidden opacity-0 pointer-events-none' : 'pt-[calc(var(--workspace-nav-height)+1rem)]'}
      `}>
          {!isCompactMode && (
            <div className="mx-auto w-full px-4 md:px-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4 ${isRTLMode ? 'flex-row-reverse' : ''}`}>
                <div className="space-y-1">
                  <h1 className={`typography-h1 text-amber-200 drop-shadow-[0_0_4px_rgba(245,158,11,0.3)] ${isRTLMode ? 'text-right' : 'text-left'}`}>
                    {t('workspace.title_prefix', 'Your Company Name')} {t('workspace.title', 'Industrial Operations Workspace')}
                  </h1>
                  <p className={`text-amber-600/80 text-xs md:text-sm mt-4 ${isRTLMode ? 'text-right' : 'text-left'}`}>
                    {t('workspace.subtitle', 'Enterprise-grade Almona cockpit for projects, customers, inventory, and commercial flows — stateful, auditable, and optimized for heavy fabrication workloads.')}
                  </p>
                </div>

                <div className="flex flex-col md:items-end gap-2 text-xs md:text-sm">
                  <AutoSaveIndicator
                    isSaving={isSaving}
                    lastSaved={lastSaved}
                    hasUnsavedChanges={hasUnsavedChanges}
                    onManualSave={manualSave}
                    className="text-xs"
                  />
                  <div className="mt-1">
                    <WorkspaceSnapshotManager />
                  </div>
                </div>
              </div>

              {/* Global Search */}
              <div className="pb-3">
                <div className="flex items-center relative w-full md:w-auto md:min-w-[280px]">
                  <Search className="absolute left-3 w-4 h-4 text-amber-600/70 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder={t('workspace.search.placeholder', 'Search inventory, profiles, orders, projects...')}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="btn-secondary-dark"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Focus Mode Toggle */}
        <div className="absolute top-[var(--workspace-nav-height)] left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => setIsCompactMode(!isCompactMode)}
            className="bg-slate-900/80 border-b-2 border-x-2 border-amber-600/40 rounded-b-lg px-3 py-0.5 text-amber-500 hover:text-amber-300 hover:bg-slate-800 transition-colors shadow-lg flex items-center justify-center gap-1 text-[10px] h-5 w-24"
            title={isCompactMode ? "Show Header" : "Focus Mode (Hide Header)"}
          >
            {isCompactMode ? (
              <>
                <span className="mb-0.5">▼</span>
              </>
            ) : (
              <>
                <span className="mb-0.5">▲</span>
              </>
            )}
          </button>
        </div>

        {/* Workspace Content */}
        <div
          className={`mx-auto w-full px-4 md:px-6 py-6 transition-all duration-300 ${isCompactMode ? 'pt-[calc(var(--workspace-nav-height)+2rem)]' : 'pt-[calc(var(--workspace-nav-height)+1rem+3.5rem)]'}`}
        >
          <div key={location.pathname} className="workspace-content-fade">
            <Outlet context={{ globalSearchQuery: state.globalSearchQuery, isCompactMode }} />
          </div>
        </div>

        {/* Minimal Footer - Copyright Only */}
        <footer className="border-t-2 mt-auto -sm relative z-10 card-glass-dark">
          <div className="mx-auto w-full px-4 md:px-6 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-amber-600/80 text-sm font-medium">
                © {new Date().getFullYear()} ALMONA Co. All rights reserved.
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-amber-600/70">
                <Link to="/terms" className="hover:text-amber-400 transition-colors font-semibold">
                  Terms & Conditions
                </Link>
                <Link to="/privacy" className="hover:text-amber-400 transition-colors font-semibold">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </LiveAnnouncerProvider>
  );
};

export default FabricatorWorkspaceLayout;
