import { useAuth } from '@/context/AuthContext';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { FabricatorContext } from '@/contexts/FabricatorContextProvider';
import { useNarrowStudioShell } from '@/hooks/useNarrowStudioShell';
import { getManufacturingSaveChrome } from '@/lib/fabricator/manufacturingSaveChrome';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { cn } from '@/lib/utils';
import { useFabricatorUIStore } from '@/stores/fabricatorUIStore';
import { useWorkflowStore } from '@/store/workflowStore';
import {
    BarChart,
    Bell,
    BookOpen,
    Box,
    ChevronRight,
    Folder,
    Home,
    Settings
} from 'lucide-react';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CollapsiblePanel } from './CollapsiblePanel';

function roleLabel(role: string | undefined | null): string {
  if (!role) return 'Signed in';
  return role
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

interface NavItem {
  id: string; // Changed to string to allow custom IDs
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  badgeType?: 'normal' | 'warning' | 'error' | 'success';
  subItems?: Array<{
    label: string;
    href: string;
    badge?: number;
  }>;
}

interface UniversalNavSidebarProps {
  activeStudio?: string;
}

export const UniversalNavSidebar: React.FC<UniversalNavSidebarProps> = ({ activeStudio }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { state: workspace } = useFabricatorWorkspace();
  const narrow = useNarrowStudioShell();
  const setPanelState = useFabricatorUIStore((s) => s.setPanelState);
  const panelState = useFabricatorUIStore((s) => s.panelStates.navigation);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const wasNarrow = useRef(narrow);
  // Safely get context - provide defaults if not available (for use outside FabricatorContextProvider)
  const fabricatorContext = useContext(FabricatorContext);
  const contextTools = fabricatorContext?.tools || [];
  const contextSectionId = fabricatorContext?.sectionId || null;

  // Auto-collapse into overlay drawer when entering a narrow viewport
  useEffect(() => {
    if (narrow && !wasNarrow.current) {
      setPanelState('navigation', true, panelState.rightCollapsed);
    }
    wasNarrow.current = narrow;
  }, [narrow, panelState.rightCollapsed, setPanelState]);

  // Close overlay after route changes on narrow screens
  useEffect(() => {
    if (!narrow) return;
    const nav = useFabricatorUIStore.getState().panelStates.navigation;
    if (!nav.leftCollapsed) {
      setPanelState('navigation', true, nav.rightCollapsed);
    }
  }, [location.pathname, narrow, setPanelState]);

  const displayName =
    user?.full_name?.trim()
    || user?.username?.trim()
    || user?.email?.trim()
    || 'Signed in';
  const displayRole = roleLabel(user?.role);
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U';
  const draftDirty = useWorkflowStore((s) => s.workflowDraftDirty);
  const workflowIdentity = useWorkflowStore((s) => s.workflowIdentity);
  const currentProject = useWorkflowStore((s) => s.currentProject);
  const saveChrome = useMemo(
    () => getManufacturingSaveChrome({
      draftDirty,
      workflowIdentity,
      project: currentProject ?? workspace.currentProject,
    }),
    [draftDirty, workflowIdentity, currentProject, workspace.currentProject],
  );
  const savedOk = saveChrome.tone === 'acknowledged';
  const savedLabel = saveChrome.tone === 'dirty'
    ? 'Unsaved draft'
    : saveChrome.tone === 'acknowledged'
      ? saveChrome.label
      : saveChrome.tone === 'local'
        ? saveChrome.label
        : null;
  
  // Navigation items for all fabricator sections (memoized for performance)
  const navItems: NavItem[] = useMemo(() => [
    {
      id: 'command',
      label: 'Command Center',
      icon: <Home size={20} />,
      href: fabricatorRoutes.studioCommand(),
    },
    {
      id: 'project',
      label: 'Project Studio',
      icon: <Folder size={20} />,
      href: fabricatorRoutes.studioProjects(),
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: <Box size={20} />,
      href: '/fabricator/studio/orders',
    },
    {
      id: 'approvals',
      label: 'Approvals',
      icon: <Box size={20} />,
      href: fabricatorRoutes.studioApprovals(),
    },
    {
      id: 'design',
      label: 'Design Studio',
      icon: <Settings size={20} />,
      href: fabricatorRoutes.studioProjects(),
    },
    {
      id: 'production',
      label: 'Production Studio',
      icon: <Box size={20} />,
      href: fabricatorRoutes.studioProduction(),
      subItems: [
        { label: 'Dashboard', href: fabricatorRoutes.studioProduction() },
        { label: 'Quality Control', href: fabricatorRoutes.studioProductionQuality() },
        { label: 'Delivery Tracking', href: fabricatorRoutes.studioProductionDelivery() },
      ],
    },
    {
      id: 'data',
      label: 'Data Studio',
      icon: <BarChart size={20} />,
      href: fabricatorRoutes.studioData(),
      subItems: [
        { label: 'System library', href: fabricatorRoutes.studioData() },
        { label: 'Profiles', href: fabricatorRoutes.studioData('profiles') },
        { label: 'Operation templates', href: fabricatorRoutes.studioData('tuning') },
        { label: 'Patterns', href: fabricatorRoutes.studioData('patterns') },
        { label: 'Stock / remnants', href: fabricatorRoutes.studioDataStock() },
        { label: 'Customers', href: fabricatorRoutes.studioData('customers') },
        { label: 'Integrations', href: fabricatorRoutes.studioDataIntegrations() },
      ],
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <BarChart size={20} />,
      href: fabricatorRoutes.studioReports(),
    },
    {
      id: 'help',
      label: 'Operator Help',
      icon: <BookOpen size={20} />,
      href: fabricatorRoutes.studioHelp(),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={20} />,
      href: '/settings',
    },
  ], []);
  
  const isActive = useCallback((href: string, id: string, subItems?: Array<{ href: string }>) => {
    if (activeStudio && (id === activeStudio || (id === 'project' && activeStudio === 'projects'))) return true;
    if (location.pathname === href) return true;
    if (location.pathname.startsWith(href + '/')) return true;
    if (subItems?.some(item => location.pathname === item.href || location.pathname.startsWith(item.href + '/'))) return true;
    return false;
  }, [location.pathname, activeStudio]);
  
  const toggleExpand = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);
  
  const getBadgeColor = (type: NavItem['badgeType']) => {
    switch (type) {
      case 'error': return 'bg-red-500 text-white';
      case 'warning': return 'bg-amber-500 text-white';
      case 'success': return 'bg-green-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };
  
  // Auto-expand items when their route is active
  useEffect(() => {
    navItems.forEach(item => {
      if (isActive(item.href, item.id, item.subItems)) {
        if (item.subItems && item.subItems.length > 0) {
          setExpandedItems(prev => new Set(prev).add(item.id));
        }
      }
    });
  }, [location.pathname, isActive, navItems]);
  
  const renderNavItem = useCallback((item: NavItem) => {
    const active = isActive(item.href, item.id, item.subItems);
    const expanded = expandedItems.has(item.id);
    
    return (
      <div key={item.id} className="mb-1">
        <Link
          to={item.href}
          className={cn(
            'flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
            'hover:bg-gray-800/50 active:bg-gray-800',
            active ? 'bg-amber-900/30 text-amber-300' : 'text-gray-300 hover:text-gray-100'
          )}
          onClick={(e) => {
            if (item.subItems && item.subItems.length > 0) {
              e.preventDefault();
              toggleExpand(item.id);
            }
          }}
          aria-label={`Navigate to ${item.label}${item.badge ? ` (${item.badge} items)` : ''}`}
          aria-current={active ? 'page' : undefined}
        >
          <div className="flex items-center space-x-3">
            <div className={cn(
              'transition-colors',
              active ? 'text-amber-400' : 'text-gray-400'
            )}>
              {item.icon}
            </div>
            <span className="text-sm font-medium">{item.label}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {item.badge !== undefined && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center font-medium',
                getBadgeColor(item.badgeType)
              )}>
                {item.badge}
              </span>
            )}
            
            {item.subItems && item.subItems.length > 0 && (
              <ChevronRight
                size={14}
                className={cn(
                  'transition-transform duration-200',
                  expanded ? 'rotate-90' : 'rotate-0'
                )}
              />
            )}
          </div>
        </Link>
        
        {/* Sub-items */}
        {item.subItems && expanded && (
          <div className="ml-9 mt-1 space-y-1">
            {item.subItems.map((subItem, index) => {
              const subActive = location.pathname === subItem.href || 
                               location.pathname.startsWith(subItem.href + '/');
              
              return (
                <Link
                  key={index}
                  to={subItem.href}
                  className={cn(
                    'flex items-center justify-between px-3 py-1.5 rounded text-sm',
                    'hover:bg-gray-800/30 transition-colors',
                    subActive 
                      ? 'text-amber-300 bg-amber-900/20' 
                      : 'text-gray-400 hover:text-gray-200'
                  )}
                  aria-label={`Navigate to ${subItem.label}`}
                  aria-current={subActive ? 'page' : undefined}
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                    <span>{subItem.label}</span>
                  </div>
                  
                  {subItem.badge !== undefined && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300">
                      {subItem.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }, [isActive, expandedItems, location.pathname, toggleExpand]);
  
  return (
    <CollapsiblePanel
      position="left"
      sectionId="navigation"
      icon={<Home size={18} />}
      title="Navigation"
      widthExpanded={280}
      widthCollapsed={48}
      variant={narrow ? 'overlay' : 'docked'}
    >
      <div className="p-4">
        {/* User Profile Mini — from auth session, not placeholders */}
        <div className="mb-6 p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center">
              <span className="text-sm font-semibold text-amber-300">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-100 truncate" title={displayName}>
                {displayName}
              </p>
              <p className="text-xs text-gray-400 truncate" title={displayRole}>
                {displayRole}
              </p>
            </div>
            <Bell size={16} className="text-gray-400" aria-hidden />
          </div>
        </div>
        
        {/* Navigation Items */}
        <nav className="space-y-1" role="navigation" aria-label="Fabricator navigation">
          {navItems.map((item) => renderNavItem(item))}
        </nav>
        
        {/* Contextual Tools Section - Shows section-specific tools */}
        {contextTools.length > 0 && contextSectionId && (
          <div className="mt-6 pt-6 border-t border-gray-800/50">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-3">
              {contextSectionId === 'fabrication' ? 'System Configuration' : 
               contextSectionId === 'drafting' ? 'Drafting Tools' :
               contextSectionId === 'commercial' ? 'Commercial Tools' : 'Tools'}
            </h3>
            <div className="space-y-1">
              {contextTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={tool.onClick}
                  disabled={tool.disabled}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                    'hover:bg-gray-800/50 active:bg-gray-800',
                    tool.disabled 
                      ? 'text-gray-500 cursor-not-allowed' 
                      : 'text-gray-300 hover:text-gray-100'
                  )}
                  title={tool.label}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {tool.icon && (
                      <div className="text-gray-400 shrink-0">
                        {tool.icon}
                      </div>
                    )}
                    <span className="truncate">{tool.label}</span>
                  </div>
                  {tool.badge !== undefined && (
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center shrink-0 ml-2',
                      tool.badgeType === 'error' ? 'bg-red-500 text-white' :
                      tool.badgeType === 'warning' ? 'bg-amber-500 text-white' :
                      tool.badgeType === 'success' ? 'bg-green-500 text-white' :
                      'bg-blue-500 text-white'
                    )}>
                      {tool.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Manufacturing save chrome (UP-14) — same source as status bar */}
        <div className="mt-8 pt-6 border-t border-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">Manufacturing save</span>
            <div className="flex items-center space-x-1">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  savedOk ? 'bg-green-500' : saveChrome.tone === 'dirty' ? 'bg-amber-500' : 'bg-slate-500',
                )}
                aria-hidden
              />
              <span
                className={cn(
                  'text-xs',
                  savedOk ? 'text-green-400' : saveChrome.tone === 'dirty' ? 'text-amber-400' : 'text-slate-400',
                )}
              >
                {savedOk
                  ? 'Acknowledged'
                  : saveChrome.tone === 'dirty'
                    ? 'Unsaved'
                    : saveChrome.tone === 'local'
                      ? 'Local'
                      : 'Unknown'}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            {savedLabel ?? 'Not recorded — open a saved position revision'}
          </div>
        </div>
      </div>
    </CollapsiblePanel>
  );
};

// Hook for navigation context (future extension)
export const useNavigation = () => {
  return {
    updateBadge: (sectionId: string, count: number) => {
      // Update badge counts dynamically (future implementation)
      console.log(`Update badge for ${sectionId}: ${count}`);
    },
    markAsRead: (sectionId: string) => {
      // Clear notifications (future implementation)
      console.log(`Mark ${sectionId} as read`);
    },
  };
};
