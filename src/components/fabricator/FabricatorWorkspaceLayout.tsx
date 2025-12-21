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
  const { branding } = useCompanyBranding();
  const { t, i18n } = useTranslation('fabricator');
  const isRTLMode = isRTL(i18n.language);
  const [searchQuery, setSearchQuery] = useState(state.globalSearchQuery || '');

  const _workspaceOwner =
    branding.workshopName?.trim() ||
    branding.companyName?.trim() ||
    t('workspace.title', 'Fabricator');

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      {/* Workspace Top Navigation Bar */}
      <WorkspaceTopNav />

      {/* Workspace Header */}
      <div className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-sm pt-[calc(4rem+1rem)]">
        <div className="mx-auto w-full px-4 md:px-6">
          <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4 ${isRTLMode ? 'flex-row-reverse' : ''}`}>
            <div className="space-y-1">
              <h1 className={`text-xl md:text-2xl font-bold text-white ${isRTLMode ? 'text-right' : 'text-left'}`}>
                {t('workspace.title_prefix', 'Your Company Name')} {t('workspace.title', 'Industrial Operations Workspace')}
              </h1>
              <p className={`text-slate-400 text-xs md:text-sm mt-4 ${isRTLMode ? 'text-right' : 'text-left'}`}>
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
              <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <Input
                type="text"
                placeholder={t('workspace.search.placeholder', 'Search inventory, profiles, orders, projects...')}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-3 py-2 rounded-full bg-slate-800/90 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/60 w-full md:w-60"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Content */}
      <div className="mx-auto w-full px-4 md:px-6 py-6 pt-[calc(4rem+1rem+3.5rem)]">
        <div key={location.pathname} className="workspace-content-fade">
          <Outlet context={{ globalSearchQuery: state.globalSearchQuery }} />
        </div>
      </div>

      {/* Minimal Footer - Copyright Only */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="mx-auto w-full px-4 md:px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} ALMONA Co. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <Link to="/terms" className="hover:text-orange-400 transition-colors">
                Terms & Conditions
              </Link>
              <Link to="/privacy" className="hover:text-orange-400 transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FabricatorWorkspaceLayout;


