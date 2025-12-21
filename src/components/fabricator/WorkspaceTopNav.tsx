import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { isRTL } from '@/lib/i18n';
import { Badge } from '@/shared/ui/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Calculator, FileText, Library, Package, Users, Boxes } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

const workspaceTabs = [
  { id: 'projects', icon: FileText, path: '/fabricator/projects', key: 'projects' },
  { id: 'customers', icon: Users, path: '/fabricator/customers', key: 'customers' },
  { id: 'inventory', icon: Package, path: '/fabricator/inventory', key: 'inventory' },
  { id: 'profiles', icon: Library, path: '/fabricator/profiles', key: 'profiles' },
  { id: 'system-packs', icon: Boxes, path: '/fabricator/system-packs', key: 'systemPacks' },
  { id: 'commercial', icon: Calculator, path: '/fabricator/commercial', key: 'commercial' },
] as const;

export const WorkspaceTopNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch } = useFabricatorWorkspace();
  const { t, i18n } = useTranslation('fabricator');
  const isRTLMode = isRTL(i18n.language);

  const activeTab =
    workspaceTabs.find((tab) => location.pathname.startsWith(tab.path))?.id || 'projects';

  const handleTabChange = (tabId: string) => {
    const tab = workspaceTabs.find((t) => t.id === tabId);
    if (!tab) return;
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId as any });
    navigate(tab.path);
  };

  return (
    <div
      className="fixed top-0 right-0 z-[150] bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/80"
      style={
        isRTLMode
          ? { right: 'var(--sidebar-width, 320px)', left: 0 }
          : { left: 'var(--sidebar-width, 320px)', right: 0 }
      }
    >
      <div className="mx-auto w-full px-4 md:px-6">
        <div className="flex items-center py-3">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="bg-slate-800/70 border border-slate-700/70 p-1 rounded-xl">
              {workspaceTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
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
        </div>
      </div>
    </div>
  );
};

