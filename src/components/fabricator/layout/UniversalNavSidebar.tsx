import { FabricatorContext } from '@/contexts/FabricatorContextProvider';
import { cn } from '@/lib/utils';
import { useFabricatorUIStore } from '@/stores/fabricatorUIStore';
import {
    BarChart,
    Bell,
    Box,
    ChevronRight,
    Folder,
    Home,
    Settings
} from 'lucide-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CollapsiblePanel } from './CollapsiblePanel';

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
  const { panelStates: _panelStates, togglePanel: _togglePanel } = useFabricatorUIStore();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  // Safely get context - provide defaults if not available (for use outside FabricatorContextProvider)
  const fabricatorContext = useContext(FabricatorContext);
  const contextTools = fabricatorContext?.tools || [];
  const contextSectionId = fabricatorContext?.sectionId || null;
  
  // Navigation items for all fabricator sections (memoized for performance)
  const navItems: NavItem[] = useMemo(() => [
    {
      id: 'command',
      label: 'Command Center',
      icon: <Home size={20} />,
      href: '/fabricator/studio/command',
    },
    {
      id: 'project',
      label: 'Project Studio',
      icon: <Folder size={20} />,
      href: '/fabricator/studio/project',
      badge: 12,
    },
    {
      id: 'design',
      label: 'Design Studio',
      icon: <Settings size={20} />, // Using Settings as placeholder for Design/Drafting
      href: '/fabricator/studio/design',
    },
    {
      id: 'production',
      label: 'Production Studio',
      icon: <Box size={20} />,
      href: '/fabricator/studio/production',
      badge: 3,
      badgeType: 'warning',
    },
    {
      id: 'data',
      label: 'Data Studio',
      icon: <BarChart size={20} />,
      href: '/fabricator/studio/data',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={20} />,
      href: '/settings',
    },
    // Legacy Routes (kept for reference or specific tools)
    {
      id: 'legacy-admin',
      label: 'Admin',
      icon: <Settings size={20} />,
      href: '/admin',
    },
  ], []);
  
  const isActive = useCallback((href: string, id: string, subItems?: Array<{ href: string }>) => {
    if (activeStudio && id === activeStudio) return true;
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
    >
      <div className="p-4">
        {/* User Profile Mini */}
        <div className="mb-6 p-3 rounded-lg bg-gray-800/30 border border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center">
              <span className="text-lg font-semibold text-amber-300">F</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-100 truncate">Fabricator User</p>
              <p className="text-xs text-gray-400">Workshop Manager</p>
            </div>
            <Bell size={16} className="text-gray-400" />
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
        
        {/* System Status */}
        <div className="mt-8 pt-6 border-t border-gray-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">System Status</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" aria-label="System online" />
              <span className="text-xs text-green-400">Online</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Last sync: 2 min ago
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
