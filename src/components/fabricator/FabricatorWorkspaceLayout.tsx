import React, { useCallback, useState } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Badge } from '@/shared/ui/ui/badge';
import { Input } from '@/shared/ui/ui/input';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { Users, Package, FileText, Calculator, Library, Search } from 'lucide-react';
import { WorkspaceSnapshotManager } from '@/components/fabricator/WorkspaceSnapshotManager';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { AutoSaveIndicator } from '@/components/fabricator/AutoSaveIndicator';
import { useAutoSave } from '@/hooks/useAutoSave';
import { WorkspaceSyncService } from '@/lib/workspace/WorkspaceSyncService';
import { useTranslation } from 'react-i18next';
import { isRTL } from '@/lib/i18n';

const workspaceTabs = [
  { id: 'projects', icon: FileText, path: '/fabricator/projects', key: 'projects' },
  { id: 'customers', icon: Users, path: '/fabricator/customers', key: 'customers' },
  { id: 'inventory', icon: Package, path: '/fabricator/inventory', key: 'inventory' },
  { id: 'profiles', icon: Library, path: '/fabricator/profiles', key: 'profiles' },
  { id: 'commercial', icon: Calculator, path: '/fabricator/commercial', key: 'commercial' },
] as const;

export const FabricatorWorkspaceLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useFabricatorWorkspace();
  const { branding } = useCompanyBranding();
  const { t, i18n } = useTranslation('fabricator');
  const isRTLMode = isRTL(i18n.language);
  const [searchQuery, setSearchQuery] = useState(state.globalSearchQuery || '');

  const workspaceOwner =
    branding.workshopName?.trim() ||
    branding.companyName?.trim() ||
    t('workspace.title', 'Fabricator');

  const activeTab =
    workspaceTabs.find((tab) => location.pathname.startsWith(tab.path))?.id || 'projects';

  const handleTabChange = (tabId: string) => {
    const tab = workspaceTabs.find((t) => t.id === tabId);
    if (!tab) return;
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId as any });
    navigate(tab.path);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 pt-[calc(4rem+1rem)]">
      {/* Workspace Header */}
      <div className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-sm">
        <div className="container mx-auto px-4 md:px-6">
          <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4 ${isRTLMode ? 'flex-row-reverse' : ''}`}>
            <div className="space-y-1">
              <h1 className={`text-xl md:text-2xl font-bold text-white ${isRTLMode ? 'text-right' : 'text-left'}`}>
                {workspaceOwner} {t('workspace.title', 'Production Workspace')}
              </h1>
              <p className={`text-slate-400 text-xs md:text-sm mt-4 ${isRTLMode ? 'text-right' : 'text-left'}`}>
                {t('workspace.subtitle', 'Heavy-duty Almona cockpit for projects, customers, inventory and commercial flows — state preserved across tabs.')}
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

          {/* Tabs with Search */}
          <div className="pb-3">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full md:w-auto">
                <TabsList className="bg-slate-800/70 border border-slate-700/70 p-1 rounded-xl">
                {workspaceTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  // Use translation with explicit namespace (since we're using useTranslation('fabricator'))
                  const label = t(`workspace.tabs.${tab.key}`, tab.key.charAt(0).toUpperCase() + tab.key.slice(1));
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className={`data-[state=active]:bg-orange-500 data-[state=active]:text-white px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-lg ${isRTLMode ? 'flex-row-reverse' : ''}`}
                    >
                      <Icon className={`h-3 w-3 md:h-4 md:w-4 ${isRTLMode ? 'ml-1.5' : 'mr-1.5'}`} />
                      {label}
                      {tab.id === 'projects' && state.currentProject && (
                        <Badge
                          variant="outline"
                          className={`${isRTLMode ? 'ml-1 md:ml-2' : 'ml-1 md:ml-2'} bg-blue-500/20 text-blue-200 border-blue-500/40 text-[9px]`}
                        >
                          {t('workspace.badges.active', 'Active')}
                        </Badge>
                      )}
                      {tab.id === 'commercial' && state.draftQuotes.length > 0 && (
                        <Badge
                          variant="outline"
                          className={`${isRTLMode ? 'ml-1 md:ml-2' : 'ml-1 md:ml-2'} bg-amber-500/20 text-amber-200 border-amber-500/40 text-[9px] ${
                            isActive ? 'border-white/40' : ''
                          }`}
                        >
                          {state.draftQuotes.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>

            {/* Global Search */}
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
      </div>

      {/* Workspace Content */}
      <div className="container mx-auto px-4 md:px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <Outlet context={{ globalSearchQuery: state.globalSearchQuery }} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Minimal Footer - Copyright Only */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="container mx-auto px-4 md:px-6 py-6">
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


