import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { isRTL } from '@/lib/i18n';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/ui/tooltip';
import { getLiveAluminumPrice } from '@/utils/marketData';
import { AnimatePresence, motion, useSpring } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  Brain,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Cpu,
  Factory,
  FileText,
  Menu,
  Package,
  Ruler,
  Scissors,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Workflow,
  Zap
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface EnterpriseSidebarProps {
  user?: {
    name: string;
    email: string;
    role: 'operator' | 'supervisor' | 'admin';
  };
  currentWorkflow?: string;
  onWorkflowChange?: (workflow: string) => void;
  onLogout?: () => void;
}

const EnterpriseSidebar: React.FC<EnterpriseSidebarProps> = ({ 
  user,
  currentWorkflow = 'measuring',
  onWorkflowChange,
  onLogout
}) => {
  const { t, i18n } = useTranslation(['fabricator', 'translation']);
  const navigate = useNavigate();
  const location = useLocation();
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [isCollapsed, setIsCollapsed] = useState(false); // Expanded by default
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(true); // hide first-open arrow by default
  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [notifications] = useState(3);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const { branding } = useCompanyBranding();

  // Collapse all menus on route change to reduce noise
  useEffect(() => {
    setActiveMenu(null);
  }, [location.pathname]);

  // Responsive sidebar sizing
  const sidebarConfig = useMemo(() => {
    if (viewportWidth < 640) {
      return { mode: 'mobile' as const, collapsed: 0, expanded: 320, drawerWidth: '82vw' };
    }
    if (viewportWidth < 768) {
      return { mode: 'mobile' as const, collapsed: 0, expanded: 320, drawerWidth: '78vw' };
    }
    if (viewportWidth < 1024) {
      return { mode: 'tablet' as const, collapsed: 74, expanded: 280 };
    }
    if (viewportWidth < 1440) {
      return { mode: 'laptop' as const, collapsed: 78, expanded: 300 };
    }
    return { mode: 'desktop' as const, collapsed: 84, expanded: 320 };
  }, [viewportWidth]);

  const isMobile = sidebarConfig.mode === 'mobile';
  const isRTLMode = isRTL(i18n.language);
  const minResizable = Math.max(sidebarConfig.collapsed + 40, 220);
  const maxResizable = Math.max(minResizable + 120, sidebarConfig.expanded + 60);

  // Track first open and show arrow animation
  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (newState === false && !hasOpenedOnce) {
      setHasOpenedOnce(true);
    }
    if (isMobile && newState) {
      setIsMobileNavOpen(false);
    }
  };

  // Mobile drawer controls
  const openMobileNav = () => {
    setIsMobileNavOpen(true);
    setIsCollapsed(false);
  };

  const closeMobileNav = () => {
    setIsMobileNavOpen(false);
    setIsCollapsed(true);
  };

  const cockpitOwner =
    branding.workshopName?.trim() ||
    branding.companyName?.trim() ||
    'Fabricator';

  // Handle viewport resize
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Workflow stages
  const workflowStages = [
    { id: 'measuring', name: t('fabricator:workflow.steps.measuring.name', 'Smart Measuring'), icon: Ruler, status: 'active' },
    { id: 'design', name: t('fabricator:workflow.steps.design.name', 'Technical Design'), icon: Settings, status: 'pending' },
    { id: 'optimization', name: t('fabricator:workflow.steps.optimization.name', 'AI Optimization'), icon: Sparkles, status: 'pending' },
    { id: 'inventory', name: t('fabricator:workflow.steps.inventory.name', 'Inventory Check'), icon: Package, status: 'pending' },
    { id: 'production', name: t('fabricator:workflow.steps.production.name', 'Production'), icon: Factory, status: 'pending' },
    { id: 'quality', name: t('fabricator:workflow.steps.quality.name', 'Quality Control'), icon: Zap, status: 'pending' }
  ];

  // Fabrication modules - Gold Tier Enhanced
  const fabricationModules = [
    {
      name: t('fabricator:navbar.fabrication_modules.cutting_optimization.name', 'Cutting Optimization'),
      path: "/fabricator-workflow#optimization",
      icon: Scissors,
      status: "verified", // Enhanced status
      efficiency: "99.8%", // Gold tier accuracy
      description: t('fabricator:navbar.fabrication_modules.cutting_optimization.description', 'AI-powered material nesting'),
      goldTierVerified: true
    },
    {
      name: t('fabricator:navbar.fabrication_modules.machine_control.name', 'Machine Control'),
      path: "/machines",
      icon: Cpu,
      status: "running",
      efficiency: "87.2%",
      description: t('fabricator:navbar.fabrication_modules.machine_control.description', 'Real-time CNC interface')
    },
    {
      name: t('fabricator:navbar.fabrication_modules.production_scheduler.name', 'Production Scheduler'),
      path: "/fabricator-workflow#production",
      icon: Workflow,
      status: "optimal",
      efficiency: "94.1%",
      description: t('fabricator:navbar.fabrication_modules.production_scheduler.description', 'Smart job sequencing')
    },
    {
      name: t('fabricator:navbar.fabrication_modules.quality_control_ai.name', 'Quality Control AI'),
      path: "/fabricator/quality",
      icon: Brain,
      status: "monitoring",
      efficiency: "96.3%",
      description: t('fabricator:navbar.fabrication_modules.quality_control_ai.description', 'Computer vision inspection')
    },
    {
      name: t('fabricator:navbar.fabrication_modules.real_time_analytics.name', 'Real-time Analytics'),
      path: "/fabricator/analytics",
      icon: BarChart3,
      status: "active",
      efficiency: "100%",
      description: t('fabricator:navbar.fabrication_modules.real_time_analytics.description', 'Live performance metrics')
    }
  ];

  // Business navigation (kept for potential future use)
  const _businessNav = [
    { name: t('fabricator:navbar.business_nav.customers', 'Customers'), path: "/fabricator/customers", icon: Users },
    { name: t('fabricator:navbar.business_nav.projects', 'Projects'), path: "/fabricator/projects", icon: Factory },
    { name: t('fabricator:navbar.business_nav.inventory', 'Inventory'), path: "/fabricator/inventory", icon: Package },
    { name: t('fabricator:navbar.business_nav.profiles', 'Profiles & Accessories'), path: "/fabricator-workflow#inventory", icon: Scissors },
    { name: t('fabricator:navbar.business_nav.quick_reports', 'Quick Reports'), path: "/reports", icon: FileText },
    { name: t('fabricator:navbar.business_nav.machines', 'Machines'), path: "/machines", icon: Cpu },
    { name: t('fabricator:navbar.business_nav.settings_prices', 'Settings & Prices'), path: "/pricing-settings", icon: Settings },
    { name: t('fabricator:navbar.business_nav.commercial_offers', 'Commercial Offers'), path: "/offers", icon: FileText },
    { name: t('fabricator:navbar.business_nav.cost_reports', 'Cost Reports'), path: "/cost-reports", icon: Calculator },
    { name: t('fabricator:navbar.business_nav.accounting', 'Accounting'), path: "/accounting", icon: Coins },
  ];

  // Quick actions
  const quickActions = [
    { name: t('fabricator:navbar.quick_actions.new_project', 'New Project'), action: () => navigate('/fabricator-workflow?new=true'), icon: Zap },
    { name: t('fabricator:navbar.quick_actions.profile_tuning', 'Profile Tuning Studio'), action: () => navigate('/fabricator/profiles?tuning=studio'), icon: Sparkles },
    { name: t('fabricator:navbar.quick_actions.machine_status', 'Machine Status'), action: () => navigate('/machine-status'), icon: Factory },
    { name: t('fabricator:navbar.quick_actions.inventory_check', 'Inventory Check'), action: () => navigate('/fabricator/inventory'), icon: Package },
    { name: t('fabricator:navbar.quick_actions.quality_reports', 'Quality Reports'), action: () => navigate('/quality-reports'), icon: Brain }
  ];

  // Navigation items structure
  type NavItem = {
    id: string;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    path?: string;
    description?: string;
    badge?: string;
    children?: NavItem[];
  };

  const fabricatorNavItems: NavItem[] = useMemo(() => [
    {
      id: 'workflow',
      label: 'AI Workflow',
      icon: Factory,
      description: 'End‑to‑end fabrication pipeline',
      children: [
        { id: 'measuring', label: 'Smart Measuring', icon: Ruler, path: '/fabricator-workflow#measuring', badge: 'AI' },
        { id: 'design', label: 'Technical Design', icon: Settings, path: '/fabricator-workflow#design', badge: 'PRO' },
        { id: 'preview3d', label: '3D Preview', icon: Box, path: '/fabricator-workflow#preview3d', badge: '3D' },
        { id: 'optimization', label: 'Cutting Optimization', icon: Scissors, path: '/fabricator-workflow#optimization', badge: 'AI' },
        { id: 'inventory', label: 'Inventory Check', icon: Package, path: '/fabricator-workflow#inventory' },
        { id: 'production', label: 'Production Planning', icon: Factory, path: '/fabricator-workflow#production' },
        { id: 'quality', label: 'Quality Control', icon: Zap, path: '/fabricator-workflow#quality' }
      ]
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: Factory,
      path: '/fabricator/projects',
      description: 'Manage all window units and positions'
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      path: '/fabricator/customers',
      description: 'Client management and portals'
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Package,
      path: '/fabricator/inventory',
      description: 'Stock management and remnants',
      badge: 'LIVE'
    },
    {
      id: 'commercial',
      label: 'Commercial',
      icon: Calculator,
      description: 'Pricing and offers',
      children: [
        { id: 'offers', label: 'Commercial Offers', icon: FileText, path: '/offers' },
        { id: 'pricing', label: 'Settings & Prices', icon: Calculator, path: '/pricing-settings' },
        { id: 'cost-reports', label: 'Cost Reports', icon: BarChart3, path: '/cost-reports' }
      ]
    },
    {
      id: 'resources',
      label: 'Resources',
      icon: Package,
      description: 'Production assets & machines',
      children: [
        { id: 'profiles', label: 'Profiles & Accessories', icon: Scissors, path: '/fabricator-workflow#inventory' },
        { id: 'machines', label: 'Machines', icon: Cpu, path: '/machines' },
        { id: 'accounting', label: 'Accounting', icon: Coins, path: '/accounting' }
      ]
    }
  ], []);

  const navItemsWithoutWorkflow = useMemo(
    () => fabricatorNavItems.filter((item) => item.id !== 'workflow'),
    [fabricatorNavItems]
  );

  const operationsIds = useMemo(() => ['projects', 'inventory', 'commercial'], []);
  const operationsItems = useMemo(
    () => navItemsWithoutWorkflow.filter((item) => operationsIds.includes(item.id)),
    [navItemsWithoutWorkflow, operationsIds]
  );
  const navRest = useMemo(
    () => navItemsWithoutWorkflow.filter((item) => !operationsIds.includes(item.id) && item.id !== 'customers'),
    [navItemsWithoutWorkflow, operationsIds]
  );

  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matches: NavItem[] = [];
    navItemsWithoutWorkflow.forEach((item) => {
      const itemMatches = item.label.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
      const matchingChildren = (item.children || []).filter(
        (child) => child.label.toLowerCase().includes(q) || (child.description && child.description.toLowerCase().includes(q))
      );
      if (itemMatches || matchingChildren.length > 0) {
        matches.push(matchingChildren.length > 0 ? { ...item, children: matchingChildren } : item);
      }
    });
    return matches;
  }, [navItemsWithoutWorkflow, searchQuery]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Status badge component - Gold Tier Enhanced
  const StatusBadge: React.FC<{ status: string; efficiency?: string }> = ({ status, efficiency }) => {
    const statusConfig = {
      verified: { color: 'text-[#003366]', bg: 'bg-[#FFD700]', border: 'border-[#003366]', dot: 'bg-green-500' }, // New Gold Tier status
      optimal: { color: 'text-emerald-400', bg: 'bg-emerald-400/20', border: 'border-emerald-400/30', dot: 'bg-emerald-400' },
      running: { color: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400/30', dot: 'bg-blue-400' },
      monitoring: { color: 'text-purple-400', bg: 'bg-purple-400/20', border: 'border-purple-400/30', dot: 'bg-purple-400' },
      active: { color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/20', border: 'border-[#FFD700]/30', dot: 'bg-[#FFD700]' },
      pending: { color: 'text-amber-400', bg: 'bg-amber-400/20', border: 'border-amber-400/30', dot: 'bg-amber-400' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] border ${config.bg} ${config.border} ${config.color} backdrop-blur-sm`}>
        <div className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
        {status === 'verified' && <span className="text-[8px]">🏆</span>}
        {efficiency ? `${efficiency}` : status}
      </div>
    );
  };

  // Sidebar width animation - responsive targets
  const sidebarWidth = useSpring(isCollapsed ? sidebarConfig.collapsed : (customWidth ?? sidebarConfig.expanded), {
    stiffness: 400,
    damping: 35,
    mass: 0.8
  });

  // Update spring target when viewport or collapsed state changes
  useEffect(() => {
    const target = isCollapsed ? sidebarConfig.collapsed : (customWidth ?? sidebarConfig.expanded);
    const applied = isMobile ? 0 : target;
    sidebarWidth.set(applied);
  }, [isCollapsed, sidebarConfig, sidebarWidth, isMobile, customWidth]);

  // Update CSS custom property for content spacing - sync with motion value
  useEffect(() => {
    const updateWidth = () => {
      const currentWidth = sidebarWidth.get();
      document.documentElement.style.setProperty('--sidebar-width', `${currentWidth}px`);
    };
    
    // Initial set
    updateWidth();
    
    // Subscribe to motion value changes
    const unsubscribe = sidebarWidth.on('change', updateWidth);
    
    return () => {
      unsubscribe();
    };
  }, [sidebarWidth]);

  // Resize drag handlers (desktop/tablet only)
  useEffect(() => {
    if (isMobile) return;
    const handleMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const next = Math.min(Math.max(e.clientX, minResizable), maxResizable);
      setCustomWidth(next);
      setIsCollapsed(false);
      sidebarWidth.set(next);
    };
    const stop = () => {
      if (isResizing) setIsResizing(false);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stop);
    };
  }, [isResizing, isMobile, minResizable, maxResizable, sidebarWidth]);

  const sidebarContent = (
    <>
      {/* Background Pattern - Blueprint Aesthetic */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none z-0"
        style={{ 
          backgroundImage: 'radial-gradient(#003366 1px, transparent 1px)', 
          backgroundSize: '20px 20px' 
        }}
      />

      {/* Header - Enterprise Grade with Gold Tier */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800/60 bg-slate-900/30 backdrop-blur-sm relative z-10">
        <motion.div
          initial={false}
          animate={{ opacity: isCollapsed ? 0 : 1, scale: isCollapsed ? 0.8 : 1 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 overflow-hidden flex-1"
        >
          <Link
            to="/"
            onClick={(e) => {
              e.preventDefault();
              setShowHomeConfirm(true);
            }}
            className="flex items-center gap-3 group relative"
          >
            {/* Gold Tier 99.8% Accuracy Badge */}
            {!isCollapsed && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="absolute -right-2 -top-2 z-20"
              >
                <div className="relative group cursor-help">
                  <div className="absolute inset-0 bg-[#FFD700] rounded-full blur-sm opacity-50 animate-pulse"></div>
                  <div className="relative px-2 py-0.5 bg-[#FFD700] rounded-full border border-[#003366] shadow-sm flex items-center gap-1">
                    <span className="text-[10px] font-bold text-[#003366]">99.8%</span>
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                  
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 top-0 bg-[#003366] text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-[#FFD700]/30 transition-opacity">
                    Certified Accuracy
                  </div>
                </div>
              </motion.div>
            )}
            
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-[#003366] via-[#004488] to-[#FFD700] shadow-lg shadow-[#003366]/40 flex items-center justify-center overflow-hidden"
            >
              <Factory className="w-5 h-5 text-white z-10" />
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            </motion.div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <span className="text-sm font-bold tracking-[0.15em] text-slate-100 uppercase leading-tight">
                  ALMONA
                </span>
                <span className="text-[10px] font-semibold text-slate-400/90 leading-tight mt-0.5">
                  {cockpitOwner} Cockpit
                </span>
              </motion.div>
            )}
          </Link>
        </motion.div>
        
        {/* Compact Animated Toggle Button - Right Side */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleToggle}
          className="relative w-3 h-3 rounded-full bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 flex-shrink-0 flex items-center justify-center transition-colors group"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {/* Animated toggle indicator */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              backgroundColor: isCollapsed 
                ? 'rgba(148, 163, 184, 0.3)' 
                : 'rgba(0, 51, 102, 0.4)',
              borderColor: isCollapsed 
                ? 'rgba(148, 163, 184, 0.5)' 
                : 'rgba(255, 215, 0, 0.6)',
            }}
            transition={{ duration: 0.3 }}
          />
          {/* Chevron icon - animated */}
          <motion.div
            animate={{
              rotate: isCollapsed ? 0 : 180,
              opacity: 1,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative z-10"
          >
            <ChevronLeft className="w-2 h-2 text-slate-300 group-hover:text-white" />
          </motion.div>
          {/* Pulse effect when active */}
          {!isCollapsed && (
            <motion.div
              className="absolute inset-0 rounded-full bg-[#FFD700]/20"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </motion.button>
      </div>
      
      {/* Animated Arrow on First Open - positioned outside sidebar */}
      <AnimatePresence>
        {!isCollapsed && !hasOpenedOnce && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="absolute left-full top-20 ml-3 z-[201] pointer-events-none"
          >
            <motion.div
              animate={{
                x: [0, 6, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-[#003366]/95 to-[#004488]/95 backdrop-blur-sm border border-[#FFD700]/60 shadow-xl shadow-[#003366]/40"
            >
              <ArrowRight className="w-4 h-4 text-white flex-shrink-0" />
              <span className="text-xs font-semibold text-white whitespace-nowrap">
                Welcome! Explore your workspace
              </span>
            </motion.div>
            {/* Arrow pointer pointing to sidebar */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-3 h-3 bg-[#003366]/95 rotate-45 border-l border-b border-[#FFD700]/60" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Market Ticker - Gold Tier */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-3 mt-3 px-4 py-2 bg-gradient-to-r from-[#003366]/30 to-[#001133]/30 border border-[#FFD700]/20 rounded-lg backdrop-blur-sm relative z-10"
        >
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5 text-blue-200">
              <span className="text-[#FFD700]">⚡</span>
              <span>LME Aluminum</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <span className="text-white font-bold">{getLiveAluminumPrice().toLocaleString()}</span>
              <span className="text-[#FFD700]">EGP</span>
              <span className="text-green-400">▲</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* System Status Bar - Enterprise Dashboard */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mx-3 mt-3 p-3 rounded-lg bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm shadow-inner relative z-10"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-slate-400">System</span>
              </div>
              <span className="text-xs font-semibold text-emerald-400">Optimal</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs text-slate-400">Efficiency</span>
              </div>
              <span className="text-xs font-semibold text-sky-400">92.5%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Factory className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-slate-400">Active Jobs</span>
              </div>
              <span className="text-xs font-semibold text-amber-400">12</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search - Enterprise Search Bar */}
      <div className="px-3 mt-3 relative z-10">
        <AnimatePresence mode="wait">
          {showSearch && !isCollapsed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setShowSearch(false)}
                autoFocus
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FFD700]/50 focus:ring-1 focus:ring-[#FFD700]/30 transition-all"
              />
            </motion.div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSearch(true)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-400 hover:text-white transition-all group"
                >
                  <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  {!isCollapsed && <span className="text-sm">Search</span>}
                </motion.button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" className="bg-slate-800 border-slate-700 text-slate-100">
                  <p>Search navigation</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Content - Scrollable Enterprise Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden mt-2 px-2.5 scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent hover:scrollbar-thumb-slate-600/70 relative z-10">
        {/* Workflow Section */}
        <div className="mb-6">
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveMenu(activeMenu === 'workflow' ? null : 'workflow')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all ${
              activeMenu === 'workflow'
                ? 'bg-gradient-to-r from-[#003366]/15 to-[#004488]/15 border border-[#FFD700]/40 shadow-sm shadow-[#003366]/10'
                : 'hover:bg-slate-800/40 border border-transparent hover:border-slate-700/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <Ruler className={`w-4 h-4 ${activeMenu === 'workflow' ? 'text-[#FFD700]' : 'text-slate-400'}`} />
              {!isCollapsed && (
                <span className={`text-sm font-medium ${activeMenu === 'workflow' ? 'text-[#FFD700]' : 'text-slate-300'}`}>
                  WorkFlow
                </span>
              )}
            </div>
            {!isCollapsed && (
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${activeMenu === 'workflow' ? 'rotate-180' : ''}`}
              />
            )}
          </motion.button>
          <AnimatePresence>
            {activeMenu === 'workflow' && !isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 space-y-1 overflow-hidden"
              >
                {workflowStages.map((stage) => {
                  const isActive = currentWorkflow === stage.id;
                  return (
                    <motion.button
                      key={stage.id}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        onWorkflowChange?.(stage.id);
                        setActiveMenu(null);
                      }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all ${
                        isActive
                          ? 'bg-[#003366]/15 text-[#FFD700] border border-[#FFD700]/40 shadow-sm'
                          : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                      }`}
                    >
                      <stage.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs">{stage.name}</span>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Operations Workspace dropdown */}
        <div className="space-y-1 mb-4">
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveMenu(activeMenu === 'operations' ? null : 'operations')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all ${
              activeMenu === 'operations'
                ? 'bg-gradient-to-r from-[#003366]/15 to-[#004488]/15 border border-[#FFD700]/40 shadow-sm shadow-[#003366]/10'
                : 'hover:bg-slate-800/40 border border-transparent hover:border-slate-700/30'
            }`}
          >
            <div className="flex items-center gap-3">
              <Workflow className={`w-4 h-4 ${activeMenu === 'operations' ? 'text-[#FFD700]' : 'text-slate-400'}`} />
              {!isCollapsed && (
                <span className={`text-sm font-medium ${activeMenu === 'operations' ? 'text-[#FFD700]' : 'text-slate-300'}`}>
                  Workspace
                </span>
              )}
            </div>
            {!isCollapsed && (
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${activeMenu === 'operations' ? 'rotate-180' : ''}`}
              />
            )}
          </motion.button>

          <AnimatePresence>
            {activeMenu === 'operations' && !isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-2 space-y-1 overflow-hidden"
              >
                {operationsItems.map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (item.path) {
                        navigate(item.path);
                        setActiveMenu(null);
                        if (isMobile) setIsMobileNavOpen(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all group ${
                      item.id === 'commercial'
                        ? 'bg-gradient-to-r from-[#003366]/15 to-[#004488]/15 border border-[#FFD700]/40 shadow-sm shadow-[#003366]/10'
                        : 'hover:bg-slate-800/40 border border-transparent hover:border-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        item.id === 'commercial' ? 'text-[#FFD700]' : 'text-slate-400 group-hover:text-white'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium truncate ${
                            item.id === 'commercial' ? 'text-slate-100' : 'text-slate-300'
                          }`}>
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#FFD700]/20 text-[#003366] border border-[#FFD700]/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className={`text-[10px] truncate mt-0.5 ${
                            item.id === 'commercial' ? 'text-slate-200/80' : 'text-slate-500'
                          }`}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Navigation (rest) */}
        <div className="space-y-1">
          {navRest.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = activeMenu === item.id;
            const isActive = location.pathname === item.path || (item.path && location.pathname.startsWith(item.path));

            return (
              <div key={item.id}>
                <motion.button
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (hasChildren) {
                      setActiveMenu(isExpanded ? null : item.id);
                    } else if (item.path) {
                      navigate(item.path);
                      if (isMobile) setIsMobileNavOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-[#003366]/15 to-[#004488]/15 border border-[#FFD700]/40 shadow-sm shadow-[#003366]/10'
                      : 'hover:bg-slate-800/40 border border-transparent hover:border-slate-700/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive ? 'text-[#FFD700]' : 'text-slate-400 group-hover:text-white'
                      }`}
                    />
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium truncate ${
                              isActive ? 'text-[#FFD700]' : 'text-slate-300'
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#FFD700]/20 text-[#003366] border border-[#FFD700]/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && !isCollapsed && (
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{item.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {hasChildren && !isCollapsed && (
                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  )}
                </motion.button>
                <AnimatePresence>
                  {isExpanded && hasChildren && !isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-1 ml-4 space-y-1 overflow-hidden border-l border-slate-700/50 pl-2"
                    >
                      {item.children?.map((child) => {
                        const isChildActive = location.pathname === child.path;
                        return (
                          <motion.button
                            key={child.id}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              if (child.path) {
                                navigate(child.path);
                                setActiveMenu(null);
                              if (isMobile) setIsMobileNavOpen(false);
                              }
                            }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-all ${
                              isChildActive
                                ? 'text-[#FFD700] bg-[#003366]/10'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                            }`}
                          >
                            <child.icon className="w-3.5 h-3.5" />
                            <span>{child.label}</span>
                            {child.badge && (
                              <span className="ml-auto text-[9px] px-1 py-0.5 rounded bg-slate-700/50 text-slate-300">
                                {child.badge}
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Fabrication Modules - Enterprise Module Section */}
        {!isCollapsed && (
          <div className="mt-5 pt-5 border-t border-slate-800/60">
            <div className="px-3 mb-2.5">
              <h3 className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest">Modules</h3>
            </div>
            <div className="space-y-1">
              {fabricationModules.map((module) => (
                <motion.div
                  key={module.name}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    to={module.path}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800/40 transition-all group border border-transparent hover:border-slate-700/30"
                  >
                    <module.icon className="w-4 h-4 text-slate-400 group-hover:text-[#FFD700] transition-colors" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-300 truncate">{module.name}</div>
                      <StatusBadge status={module.status} efficiency={module.efficiency} />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions - Enterprise Quick Access */}
        {!isCollapsed && (
          <div className="mt-5 pt-5 border-t border-slate-800/60">
            <div className="px-3 mb-2.5">
              <h3 className="text-[10px] font-bold text-slate-500/80 uppercase tracking-widest">Quick Actions</h3>
            </div>
            <div className="space-y-1">
              {quickActions.map((action) => (
                <motion.button
                  key={action.name}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => action.action()}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800/40 transition-all group text-left border border-transparent hover:border-slate-700/30"
                >
                  <action.icon className="w-4 h-4 text-slate-400 group-hover:text-[#FFD700] transition-colors" />
                  <span className="text-xs font-medium text-slate-300">{action.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer - Enterprise Footer Section */}
      <div className="border-t border-slate-800/60 bg-slate-900/20 backdrop-blur-sm p-3 space-y-2 relative z-10">
        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-400 hover:text-white transition-all group"
        >
          <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" />
          {!isCollapsed && (
            <>
              <span className="text-sm flex-1 text-left">Notifications</span>
              {notifications > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white"
                >
                  {notifications}
                </motion.span>
              )}
            </>
          )}
          {isCollapsed && notifications > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-slate-950"
            />
          )}
        </motion.button>

        {/* Language Switcher */}
        {!isCollapsed && (
          <div className="px-3">
            <LanguageSwitcher variant="icons" />
          </div>
        )}

        {/* User Menu */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative"
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveMenu(activeMenu === 'user' ? null : 'user')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#003366] to-[#FFD700] flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-slate-300 truncate">{user?.name || 'Operator'}</div>
                <div className="text-[10px] text-slate-500 truncate">{user?.email || 'operator@fabricator.com'}</div>
              </div>
            )}
            {!isCollapsed && (
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  activeMenu === 'user' ? 'rotate-180' : ''
                }`}
              />
            )}
          </motion.button>
          <AnimatePresence>
            {activeMenu === 'user' && !isCollapsed && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-0 mb-2 w-full bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl overflow-hidden z-50"
              >
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => {
                      navigate('/fabricator/settings/branding');
                      setActiveMenu(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <Settings className="w-4 h-4 text-[#FFD700]" />
                    <span className="text-sm text-slate-300">Settings</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors text-left text-red-400"
                    onClick={() => setShowLogoutConfirm(true)}
                  >
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Logout confirmation */}
        <AnimatePresence>
          {showLogoutConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
              onClick={() => setShowLogoutConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/60 p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#003366] to-[#004488] flex items-center justify-center text-white font-bold shadow-lg shadow-[#003366]/40 border border-[#FFD700]/30">
                    !
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {t('confirmation.signOut.title', 'Confirm sign out')}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {t('confirmation.signOut.body', 'You will be logged out of Fabricator Pro.')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    {t('confirmation.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={() => {
                      setShowLogoutConfirm(false);
                      setActiveMenu(null);
                      onLogout?.();
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#003366] to-[#004488] text-white shadow-lg shadow-[#003366]/30 hover:from-[#004488] hover:to-[#003366] transition-colors border border-[#FFD700]/30"
                  >
                    {t('confirmation.signOut.action', 'Sign Out')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Home (Logo) confirmation */}
        <AnimatePresence>
          {showHomeConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
              onClick={() => setShowHomeConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/60 p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#003366] via-[#004488] to-[#FFD700] flex items-center justify-center text-white font-bold shadow-lg shadow-[#003366]/40">
                    ⓘ
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {t('confirmation.home.title', 'Leave this workspace?')}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {t('confirmation.home.body', 'You’re about to return to the home page.')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowHomeConfirm(false)}
                    className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    {t('confirmation.home.stay', 'Stay')}
                  </button>
                  <button
                    onClick={() => {
                      setShowHomeConfirm(false);
                      setIsMobileNavOpen(false);
                      navigate('/');
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#003366] to-[#004488] text-white shadow-lg shadow-[#003366]/30 hover:from-[#004488] hover:to-[#003366] transition-colors border border-[#FFD700]/30"
                  >
                    {t('confirmation.home.leave', 'Leave')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  return (
    <TooltipProvider delayDuration={300}>
      {/* Sidebar */}
      {!isMobile && (
        <motion.aside
          ref={sidebarRef}
          dir={isRTLMode ? 'rtl' : 'ltr'}
          style={{ width: sidebarWidth }}
          className={`fixed ${isRTLMode ? 'right-0' : 'left-0'} top-0 h-screen z-[200] flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 backdrop-blur-2xl border-${isRTLMode ? 'l' : 'r'} border-slate-800/60 shadow-2xl shadow-black/50 will-change-[width] overflow-hidden`}
        >
          {sidebarContent}
          {/* Resize handle */}
          {!isMobile && (
            <div
              className={`absolute ${isRTLMode ? 'left-0' : 'right-0'} top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-[#FFD700]/20`}
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
              }}
            />
          )}
        </motion.aside>
      )}

      {/* Mobile FAB */}
      {isMobile && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openMobileNav}
          className={`fixed ${isRTLMode ? 'right-4' : 'left-4'} bottom-6 z-[255] h-12 w-12 rounded-full bg-gradient-to-r from-[#003366] to-[#004488] shadow-xl shadow-[#003366]/30 border border-[#FFD700]/40 text-white flex items-center justify-center`}
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </motion.button>
      )}

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobile && isMobileNavOpen && (
          <motion.div
            className="fixed inset-0 z-[260] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileNav}
          >
            <motion.div
              className={`absolute ${isRTLMode ? 'right-0' : 'left-0'} top-0 h-full bg-slate-950/98 ${isRTLMode ? 'border-l' : 'border-r'} border-slate-800/60 shadow-2xl shadow-black/60 overflow-hidden`}
              style={{ width: sidebarConfig.drawerWidth || '82vw' }}
              initial={{ x: isRTLMode ? 20 : -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isRTLMode ? 20 : -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {sidebarContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results Overlay */}
      <AnimatePresence>
        {searchQuery && !isCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={isRTLMode ? { right: `var(--sidebar-width, 320px)` } : { left: `var(--sidebar-width, 320px)` }}
            className={`fixed top-20 z-[190] w-96 bg-slate-950/98 border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-xl ${isRTLMode ? 'mr-2' : 'ml-2'}`}
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
              <Search className="h-4 w-4 text-[#FFD700]" />
              <span className="text-sm font-semibold text-slate-100">Search Results</span>
              <span className="ml-auto text-[11px] text-slate-500">{filteredNavItems.length} matches</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {filteredNavItems.length > 0 ? (
                filteredNavItems.map((item) => (
                  <div key={item.id} className="border-b border-slate-800/60 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.path) {
                          setSearchQuery('');
                          navigate(item.path);
                        }
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-3"
                    >
                      <item.icon className="h-4 w-4 text-[#FFD700]" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-100">{item.label}</span>
                          {item.badge && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#FFD700]/40 text-[#FFD700] bg-[#003366]/10 uppercase font-semibold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </button>
                    {item.children && item.children.length > 0 && (
                      <div className="pb-2">
                        {item.children.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => {
                              if (child.path) {
                                setSearchQuery('');
                                navigate(child.path);
                              }
                            }}
                            className="w-full text-left pl-12 pr-4 py-2 hover:bg-white/5 transition-colors flex items-center gap-3 text-xs"
                          >
                            <child.icon className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-200">{child.label}</span>
                            {child.badge && (
                              <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full border border-slate-600 text-slate-300 bg-slate-800/60 uppercase">
                                {child.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-slate-500 text-sm">
                  No results found for "<span className="text-slate-200">{searchQuery}</span>"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
};

export default EnterpriseSidebar;

