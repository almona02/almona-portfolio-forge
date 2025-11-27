import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Badge } from '@/shared/ui/ui/badge';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { Users, Package, FileText, Calculator, Save } from 'lucide-react';
import { WorkspaceSnapshotManager } from '@/components/fabricator/WorkspaceSnapshotManager';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';

const workspaceTabs = [
  { id: 'projects', label: 'Projects', icon: FileText, path: '/fabricator/projects' },
  { id: 'customers', label: 'Customers', icon: Users, path: '/fabricator/customers' },
  { id: 'inventory', label: 'Inventory', icon: Package, path: '/fabricator/inventory' },
  { id: 'commercial', label: 'Commercial', icon: Calculator, path: '/fabricator/commercial' },
] as const;

export const FabricatorWorkspaceLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useFabricatorWorkspace();
  const { branding } = useCompanyBranding();

  const workspaceOwner =
    branding.workshopName?.trim() ||
    branding.companyName?.trim() ||
    'Fabricator';

  const activeTab =
    workspaceTabs.find((tab) => location.pathname.startsWith(tab.path))?.id || 'projects';

  const handleTabChange = (tabId: string) => {
    const tab = workspaceTabs.find((t) => t.id === tabId);
    if (!tab) return;
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId as any });
    navigate(tab.path);
  };

  const lastSavedLabel = state.lastSaved
    ? `Saved ${new Date(state.lastSaved).toLocaleTimeString()}`
    : 'Workspace active';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      {/* Workspace Header */}
      <div className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-sm">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4">
            <div className="space-y-1">
              <h1 className="text-xl md:text-2xl font-bold text-white">
                {workspaceOwner} Production Workspace
              </h1>
              <p className="text-slate-400 text-xs md:text-sm">
                Heavy-duty Almona cockpit for projects, customers, inventory and commercial flows —
                state preserved across tabs.
              </p>
            </div>

            <div className="flex flex-col md:items-end gap-2 text-xs md:text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{lastSavedLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Save className="h-3 w-3" />
                <span>Auto-save to browser workspace enabled</span>
              </div>
              <div className="mt-1">
                <WorkspaceSnapshotManager />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="pb-3">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full md:w-auto">
              <TabsList className="bg-slate-800/70 border border-slate-700/70 p-1 rounded-xl">
                {workspaceTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="data-[state=active]:bg-orange-500 data-[state=active]:text-white px-3 md:px-4 py-1.5 text-xs md:text-sm rounded-lg"
                    >
                      <Icon className="h-3 w-3 md:h-4 md:w-4 mr-1.5" />
                      {tab.label}
                      {tab.id === 'projects' && state.currentProject && (
                        <Badge
                          variant="outline"
                          className="ml-1 md:ml-2 bg-blue-500/20 text-blue-200 border-blue-500/40 text-[9px]"
                        >
                          Active
                        </Badge>
                      )}
                      {tab.id === 'commercial' && state.draftQuotes.length > 0 && (
                        <Badge
                          variant="outline"
                          className={`ml-1 md:ml-2 bg-amber-500/20 text-amber-200 border-amber-500/40 text-[9px] ${
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
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FabricatorWorkspaceLayout;


