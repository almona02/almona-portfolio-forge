import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { AlmonaNavbarLogo } from '@/components/ui/AlmonaNavbarLogo';
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
  Boxes,
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
  const logoClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { branding } = useCompanyBranding();

  // Collapse all menus on route change to reduce noise
  useEffect(() => {
    setActiveMenu(null);
  }, [location.pathname]);

  // Cleanup logo click timeout on unmount
  useEffect(() => {
    return () => {
      if (logoClickTimeoutRef.current) {
        clearTimeout(logoClickTimeoutRef.current);
      }
    };
  }, []);

  // Responsive sidebar sizing - Optimized for minimum space
  const sidebarConfig = useMemo(() => {
    if (viewportWidth < 640) {
      return { mode: 'mobile' as const, collapsed: 0, expanded: 280, drawerWidth: '82vw' };
    }
    if (viewportWidth < 768) {
      return { mode: 'mobile' as const, collapsed: 0, expanded: 280, drawerWidth: '78vw' };
    }
    if (viewportWidth < 1024) {
      return { mode: 'tablet' as const, collapsed: 74, expanded: 240 };
    }
    if (viewportWidth < 1440) {
      return { mode: 'laptop' as const, collapsed: 78, expanded: 260 };
    }
    return { mode: 'desktop' as const, collapsed: 84, expanded: 280 };
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
  const _workflowStages = [
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
    { name: t('fabricator:navbar.quick_actions.system_pack_management', 'System Pack Management'), action: () => navigate('/fabricator-workflow#inventory'), icon: Settings },
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

  // Unified Navigation: 4 items max (Projects, Workflow, Studio, User)
  // Gold Tier: Clean, contextual navigation inspired by Supabase design
  const fabricatorNavItems: NavItem[] = useMemo(() => {
    // Check if unified workflow is enabled
    const unifiedEnabled = typeof window !== 'undefined' 
      ? localStorage.getItem('almona:unified-workflow') === 'true' || localStorage.getItem('almona:unified-workflow') === null
      : true;

    if (unifiedEnabled) {
      // Unified 4-item navigation
      return [
        {
          id: 'projects',
          label: 'Projects',
          icon: FileText,
          path: '/fabricator/projects',
          description: 'Window units & positions'
        },
        {
          id: 'workflow',
          label: 'Workflow',
          icon: Workflow,
          path: '/fabricator/workflow/engineering-bay',
          description: 'Fabrication pipeline',
          badge: 'UNIFIED'
        },
        {
          id: 'studio',
          label: 'Studio',
          icon: Settings,
          path: '/fabricator/studio',
          description: 'Profile & System Pack tuning',
          children: [
            { id: 'profile-studio', label: 'Profile Studio', icon: Ruler, path: '/fabricator/profile-studio' },
            { id: 'system-pack-studio', label: 'System Pack Studio', icon: Boxes, path: '/fabricator/system-pack-studio' },
            { id: 'tuning-studio', label: 'Tuning Studio', icon: Settings, path: '/fabricator/tuning-studio' }
          ]
        },
        {
          id: 'user',
          label: 'User',
          icon: Users,
          description: 'Settings & account',
          children: [
            { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
            { id: 'customers', label: 'Customers', icon: Users, path: '/fabricator/customers' },
            { id: 'inventory', label: 'Inventory', icon: Package, path: '/fabricator/inventory', badge: 'LIVE' },
            { id: 'commercial', label: 'Commercial', icon: Calculator, path: '/offers' }
          ]
        }
      ];
    }

    // Legacy navigation (backward compatible)
    return [
      {
        id: 'workflow',
        label: 'Workflow',
        icon: Workflow,
        description: 'Fabrication pipeline',
        children: [
          { id: 'measuring', label: 'Measuring', icon: Ruler, path: '/fabricator-workflow#measuring', badge: 'AI' },
          { id: 'design', label: 'Design', icon: Settings, path: '/fabricator-workflow#design', badge: 'PRO' },
          { id: 'preview3d', label: '3D Preview', icon: Box, path: '/fabricator-workflow#preview3d', badge: '3D' },
          { id: 'optimization', label: 'Optimization', icon: Scissors, path: '/fabricator-workflow#optimization', badge: 'AI' },
          { id: 'production', label: 'Production', icon: Factory, path: '/fabricator-workflow#production' },
          { id: 'quality', label: 'Quality', icon: Zap, path: '/fabricator-workflow#quality' }
        ]
      },
      {
        id: 'projects',
        label: 'Projects',
        icon: FileText,
        path: '/fabricator/projects',
        description: 'Window units & positions'
      },
      {
        id: 'customers',
        label: 'Customers',
        icon: Users,
        path: '/fabricator/customers',
        description: 'Client management'
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: Package,
        path: '/fabricator/inventory',
        description: 'Stock & remnants',
        badge: 'LIVE'
      },
      {
        id: 'commercial',
        label: 'Commercial',
        icon: Calculator,
        description: 'Pricing & offers',
        children: [
          { id: 'offers', label: 'Offers', icon: FileText, path: '/offers' },
          { id: 'pricing', label: 'Pricing', icon: Calculator, path: '/pricing-settings' },
          { id: 'reports', label: 'Reports', icon: BarChart3, path: '/cost-reports' }
        ]
      },
      {
        id: 'resources',
        label: 'Resources',
        icon: Settings,
        description: 'System configuration',
        children: [
          { id: 'system-packs', label: 'System Packs & Profiles', icon: Boxes, path: '/fabricator-workflow#inventory', badge: 'TUNE' },
          { id: 'machines', label: 'Machines', icon: Cpu, path: '/machines' }
        ]
      }
    ];
  }, []);

  const navItemsWithoutWorkflow = useMemo(
    () => fabricatorNavItems.filter((item) => item.id !== 'workflow'),
    [fabricatorNavItems]
  );

  const operationsIds = useMemo(() => ['projects', 'inventory', 'commercial'], []);
  const _operationsItems = useMemo(
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
      monitoring: { color: 'text-amber-400', bg: 'bg-amber-400/20', border: 'border-amber-400/30', dot: 'bg-amber-400' },
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
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3.5 border-b border-amber-600/30 bg-[#0f0f0f]/50 backdrop-blur-sm relative z-10">
        <motion.div
          initial={false}
          animate={{ opacity: isCollapsed ? 0 : 1, scale: isCollapsed ? 0.8 : 1 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 overflow-hidden flex-1"
        >
          <div
            onClick={(e) => {
              e.preventDefault();
              // Clear any pending single click
              if (logoClickTimeoutRef.current) {
                clearTimeout(logoClickTimeoutRef.current);
                logoClickTimeoutRef.current = null;
                // This is a double click - show exit confirmation
              setShowHomeConfirm(true);
              } else {
                // Set timeout for single click detection
                logoClickTimeoutRef.current = setTimeout(() => {
                  // Single click - navigate to projects
                  navigate('/fabricator/projects');
                  logoClickTimeoutRef.current = null;
                }, 300); // 300ms delay to detect double click
              }
            }}
            className="flex items-center gap-3 group relative cursor-pointer"
          >
            
            <AlmonaNavbarLogo size={40} />
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <span className="typography-h3 text-xs sm:text-sm bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent uppercase leading-tight truncate">
                  ALMONA
                </span>
                <span className="text-[9px] sm:text-[10px] font-semibold text-amber-600/90 leading-tight mt-0.5 truncate">
                  {cockpitOwner} Cockpit
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
        
        {/* Compact Animated Toggle Button - Right Side */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleToggle}
          className="btn-secondary"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {/* Animated toggle indicator */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              backgroundColor: isCollapsed 
                ? 'rgba(245, 158, 11, 0.2)' 
                : 'rgba(245, 158, 11, 0.3)',
              borderColor: isCollapsed 
                ? 'rgba(245, 158, 11, 0.4)' 
                : 'rgba(245, 158, 11, 0.5)',
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
            <ChevronLeft className="w-2 h-2 text-amber-300 group-hover:text-amber-200" />
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
          className="mx-3 mt-3 px-4 py-2 bg-gradient-to-r from-amber-600/30 to-amber-500/30 border border-amber-500/20 rounded-lg backdrop-blur-sm relative z-10"
        >
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5 text-amber-300">
              <span className="text-amber-400">⚡</span>
              <span>LME Aluminum</span>
            </div>
            <div className="flex items-center gap-1 font-mono">
              <span className="text-amber-200 font-bold">{getLiveAluminumPrice().toLocaleString()}</span>
              <span className="text-amber-400">EGP</span>
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
          className="mx-3 mt-3 p-3 rounded-lg bg-[#0f0f0f]/60 border border-amber-600/20 backdrop-blur-sm shadow-inner relative z-10 card-dark"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 status-valid" />
                <span className="text-xs text-amber-600/70">System</span>
              </div>
              <span className="text-xs font-semibold status-valid">Optimal</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs text-amber-600/70">Efficiency</span>
              </div>
              <span className="text-xs font-semibold text-sky-400">92.5%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Factory className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-amber-600/70">Active Jobs</span>
              </div>
              <span className="text-xs font-semibold text-amber-400">12</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search - Enterprise Search Bar */}
      <div className="px-3 mt-2 relative z-10">
        <AnimatePresence mode="wait">
          {showSearch && !isCollapsed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600/70" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setShowSearch(false)}
                autoFocus
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0f0f0f]/60 border border-amber-600/20 text-sm text-amber-200 placeholder-amber-600/50 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all card-dark"
              />
            </motion.div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSearch(true)}
                  className="btn-secondary w-full justify-start text-xs"
                >
                  <Search className={`${isCollapsed ? 'w-5 h-5' : 'w-3.5 h-3.5'} group-hover:scale-110 transition-transform flex-shrink-0`} />
                  {!isCollapsed && <span className="text-xs">Search</span>}
                </motion.button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" className="bg-[#0f0f0f] border-amber-600/30 text-amber-200 card-dark">
                  <p>Search navigation</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Content - Supabase-inspired Clean Design */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden mt-4 px-2 scrollbar-thin scrollbar-thumb-amber-600/30 scrollbar-track-transparent relative z-10 min-h-0">
        {/* Quick Actions - Enterprise Quick Access (Moved to Top) */}
        {!isCollapsed && (
          <div className="mb-4 pb-4 border-b border-amber-600/30">
            <motion.button
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveMenu(activeMenu === 'quickActions' ? null : 'quickActions')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all mb-2 ${
                activeMenu === 'quickActions'
                  ? 'bg-gradient-to-r from-amber-600/15 to-amber-500/15 border border-amber-500/40 shadow-sm shadow-amber-900/10'
                  : 'hover:bg-[#0f0f0f]/40 border border-amber-600/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <Zap className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${activeMenu === 'quickActions' ? 'text-amber-400' : 'text-amber-600/70'}`} />
                <span className={`text-sm font-medium ${activeMenu === 'quickActions' ? 'text-amber-400' : 'text-amber-300'}`}>
                  Quick Actions
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-amber-600/70 transition-transform ${activeMenu === 'quickActions' ? 'rotate-180' : ''}`}
              />
            </motion.button>
            <AnimatePresence>
              {activeMenu === 'quickActions' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  {quickActions.map((action) => (
                    <motion.button
                      key={action.name}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        action.action();
                        if (isMobile) setIsMobileNavOpen(false);
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#0f0f0f]/40 transition-all group border border-transparent hover:border-amber-600/30 w-full text-left card-dark"
                    >
                      <action.icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-amber-600/70 group-hover:text-amber-400 transition-colors`} />
                      <span className="text-xs font-medium text-amber-300">{action.name}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Workflow Section - Supabase Style */}
        <div className="mb-6">
          <button
            onClick={() => setActiveMenu(activeMenu === 'workflow' ? null : 'workflow')}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors ${
              activeMenu === 'workflow'
                ? 'text-amber-200'
                : 'text-amber-600/70 hover:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Workflow className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
              {!isCollapsed && <span>Workflow</span>}
            </div>
            {!isCollapsed && (
              <ChevronDown
                className={`w-3 h-3 transition-transform ${activeMenu === 'workflow' ? 'rotate-180' : ''}`}
              />
            )}
          </button>
          <AnimatePresence>
            {activeMenu === 'workflow' && !isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-1 ml-6 space-y-0.5 overflow-hidden"
              >
                {fabricatorNavItems.find(item => item.id === 'workflow')?.children?.map((stage) => {
                  const isActive = currentWorkflow === stage.id || location.pathname.includes(stage.path || '');
                  return (
                    <button
                      key={stage.id}
                      onClick={() => {
                        if (stage.path) navigate(stage.path);
                        onWorkflowChange?.(stage.id);
                        setActiveMenu(null);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                        isActive
                          ? 'bg-[#0f0f0f]/80 text-amber-400'
                          : 'text-amber-600/70 hover:text-amber-300 hover:bg-[#0f0f0f]/50'
                      }`}
                    >
                      <stage.icon className={`${isCollapsed ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
                      <span>{stage.label}</span>
                      {stage.badge && (
                        <span className={stage.badge === 'LIVE' ? 'badge-live-bronze' : 'btn-primary'}>
                          {stage.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Navigation - Supabase Style: Clean & Minimal */}
        <div className="space-y-0.5">
          {navItemsWithoutWorkflow.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = activeMenu === item.id;
            const isActive = location.pathname === item.path || (item.path && location.pathname.startsWith(item.path));

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (hasChildren) {
                      setActiveMenu(isExpanded ? null : item.id);
                    } else if (item.path) {
                      navigate(item.path);
                      if (isMobile) setIsMobileNavOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors ${
                    isActive
                      ? 'bg-[#0f0f0f]/80 text-amber-400'
                      : 'text-amber-600/70 hover:text-amber-200 hover:bg-[#0f0f0f]/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <item.icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                    {!isCollapsed && (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className={item.badge === 'LIVE' ? 'badge-live-bronze' : 'btn-primary'}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {hasChildren && !isCollapsed && (
                    <ChevronRight
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  )}
                </button>
                <AnimatePresence>
                  {isExpanded && hasChildren && !isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-0.5 ml-6 space-y-0.5 overflow-hidden"
                    >
                      {item.children?.map((child) => {
                        const isChildActive = location.pathname === child.path;
                        return (
                          <button
                            key={child.id}
                            onClick={() => {
                              if (child.path) {
                                navigate(child.path);
                                setActiveMenu(null);
                                if (isMobile) setIsMobileNavOpen(false);
                              }
                            }}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                              isChildActive
                                ? 'bg-[#0f0f0f]/80 text-amber-400'
                                : 'text-amber-600/70 hover:text-amber-300 hover:bg-[#0f0f0f]/50'
                            }`}
                          >
                            <child.icon className="w-3.5 h-3.5" />
                            <span>{child.label}</span>
                            {child.badge && (
                              <span className={child.badge === 'LIVE' ? 'badge-live-bronze' : 'btn-primary'}>
                                {child.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
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
                      ? 'bg-gradient-to-r from-amber-600/15 to-amber-500/15 border border-amber-500/40 shadow-sm shadow-amber-900/10'
                      : 'hover:bg-[#0f0f0f]/40 border border-transparent hover:border-amber-600/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon
                      className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0 transition-colors ${
                        isActive ? 'text-amber-400' : 'text-amber-600/70 group-hover:text-amber-200'
                      }`}
                    />
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium truncate ${
                              isActive ? 'text-amber-400' : 'text-amber-300'
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.badge && (
                            <span className={item.badge === 'LIVE' ? 'badge-live-bronze' : 'px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#FFD700]/20 text-[#003366] border border-[#FFD700]/30'}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && !isCollapsed && (
                          <p className="text-[10px] text-amber-600/70 truncate mt-0.5">{item.description}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {hasChildren && !isCollapsed && (
                    <ChevronRight
                      className={`w-4 h-4 text-amber-600/70 transition-transform ${
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
                      className="mt-1 ml-4 space-y-1 overflow-hidden border-l border-amber-600/30 pl-2"
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
                                ? 'text-amber-400 bg-amber-600/10'
                                : 'text-amber-600/70 hover:text-amber-200 hover:bg-[#0f0f0f]/50'
                            }`}
                          >
                            <child.icon className="w-3.5 h-3.5" />
                            <span>{child.label}</span>
                            {child.badge && (
                              <span className={child.badge === 'LIVE' ? 'badge-live-bronze' : 'btn-secondary'}>
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

        {/* Fabrication Modules - Enterprise Module Section (Collapsible, Hidden by Default) */}
        {!isCollapsed && (
          <div className="mt-5 pt-5 border-t border-amber-600/30">
            <motion.button
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveMenu(activeMenu === 'modules' ? null : 'modules')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all mb-2 ${
                activeMenu === 'modules'
                  ? 'bg-gradient-to-r from-amber-600/15 to-amber-500/15 border border-amber-500/40 shadow-sm shadow-amber-900/10'
                  : 'hover:bg-[#0f0f0f]/40 border border-transparent hover:border-amber-600/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${activeMenu === 'modules' ? 'text-amber-400' : 'text-amber-600/70'}`} />
                <span className={`text-sm font-medium ${activeMenu === 'modules' ? 'text-amber-400' : 'text-amber-300'}`}>
                  Modules
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-amber-600/70 transition-transform ${activeMenu === 'modules' ? 'rotate-180' : ''}`}
              />
            </motion.button>
            <AnimatePresence>
              {activeMenu === 'modules' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  {fabricationModules.map((module) => (
                    <motion.div
                      key={module.name}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link
                        to={module.path}
                        onClick={() => {
                          if (isMobile) setIsMobileNavOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#0f0f0f]/40 transition-all group border border-transparent hover:border-amber-600/30 card-dark"
                      >
                        <module.icon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-amber-600/70 group-hover:text-amber-400 transition-colors`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-amber-300 truncate">{module.name}</div>
                          <StatusBadge status={module.status} efficiency={module.efficiency} />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>

      {/* Footer - Enterprise Footer Section */}
      <div className="border-t border-amber-600/30 bg-[#0a0a0a]/80 backdrop-blur-sm p-2 space-y-1.5 relative z-10">
        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-secondary w-full justify-start text-xs"
        >
          <Bell className={`${isCollapsed ? 'w-5 h-5' : 'w-3.5 h-3.5'} group-hover:scale-110 transition-transform flex-shrink-0`} />
          {!isCollapsed && (
            <>
              <span className="text-xs flex-1 text-left">Notifications</span>
              {notifications > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-red-500 text-white"
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
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-[#0a0a0a]"
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
            className="btn-secondary w-full"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center flex-shrink-0 shadow-glow-strong ring-2 ring-amber-500/30">
              <User className="w-3.5 h-3.5 text-[#0a0a0a] font-bold" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-medium text-amber-300 truncate">{user?.name || 'Operator'}</div>
                <div className="text-[9px] text-amber-600/70 truncate">{user?.email || 'operator@fabricator.com'}</div>
              </div>
            )}
            {!isCollapsed && (
              <ChevronDown
                className={`w-3.5 h-3.5 text-amber-600/70 transition-transform flex-shrink-0 ${
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
                className="absolute bottom-full left-0 mb-2 w-full bg-[#0f0f0f]/95 border border-amber-600/30 rounded-lg shadow-2xl overflow-hidden z-50 card-dark"
              >
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => {
                      navigate('/fabricator/settings/branding');
                      setActiveMenu(null);
                    }}
                    className="btn-secondary"
                  >
                    <Settings className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} text-amber-400`} />
                    <span className="text-sm text-amber-300">Settings</span>
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
                className="max-w-sm w-full bg-[#0f0f0f] border border-amber-600/30 rounded-2xl shadow-2xl shadow-amber-900/20 p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 flex items-center justify-center text-[#0a0a0a] font-bold shadow-lg shadow-amber-900/40 border border-amber-400/30">
                    !
                  </div>
                  <div>
                    <h3 className="typography-h3 text-lg text-white">
                      {t('confirmation.signOut.title', 'Confirm sign out')}
                    </h3>
                    <p className="text-sm text-amber-600/70">
                      {t('confirmation.signOut.body', 'You will be logged out of Fabricator Pro.')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="px-4 py-2 rounded-lg border border-amber-600/30 text-amber-200 hover:bg-[#0f0f0f]/60 transition-colors card-dark"
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
                className="max-w-sm w-full bg-[#0f0f0f] border border-amber-600/30 rounded-2xl shadow-2xl shadow-amber-900/20 p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center text-[#0a0a0a] font-bold shadow-lg shadow-amber-900/40">
                    ⓘ
                  </div>
                  <div>
                    <h3 className="typography-h3 text-lg text-white">
                      {t('confirmation.home.title', 'Leave this workspace?')}
                    </h3>
                    <p className="text-sm text-amber-600/70">
                      {t('confirmation.home.body', "You're about to return to the home page.")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowHomeConfirm(false)}
                    className="px-4 py-2 rounded-lg border border-amber-600/30 text-amber-200 hover:bg-[#0f0f0f]/60 transition-colors card-dark"
                  >
                    {t('confirmation.home.stay', 'Stay')}
                  </button>
                  <button
                    onClick={() => {
                      setShowHomeConfirm(false);
                      setIsMobileNavOpen(false);
                      navigate('/');
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-[#0a0a0a] shadow-lg shadow-amber-900/30 hover:from-amber-500 hover:to-amber-600 transition-colors border border-amber-400/30"
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
          className={`fixed ${isRTLMode ? 'right-0' : 'left-0'} top-0 h-screen z-[200] flex flex-col bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a] backdrop-blur-2xl border-${isRTLMode ? 'l' : 'r'} border-amber-600/30 shadow-2xl shadow-amber-900/20 will-change-[width] w-full sm:w-auto`}
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
              className={`absolute ${isRTLMode ? 'right-0' : 'left-0'} top-0 h-full bg-[#0a0a0a]/98 ${isRTLMode ? 'border-l' : 'border-r'} border-amber-600/30 shadow-2xl shadow-amber-900/20 flex flex-col`}
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
            className={`fixed top-20 z-[190] w-96 bg-[#0a0a0a]/98 border border-amber-600/50 rounded-2xl shadow-2xl shadow-amber-900/20 overflow-hidden backdrop-blur-xl ${isRTLMode ? 'mr-2' : 'ml-2'}`}
          >
            <div className="px-4 py-3 border-b border-amber-600/30 flex items-center gap-2">
              <Search className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-200">Search Results</span>
              <span className="ml-auto text-[11px] text-amber-600/70">{filteredNavItems.length} matches</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {filteredNavItems.length > 0 ? (
                filteredNavItems.map((item) => (
                  <div key={item.id} className="border-b border-amber-600/30 last:border-b-0">
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
                          <span className="text-sm font-semibold text-amber-200">{item.label}</span>
                          {item.badge && (
                            <span className={item.badge === 'LIVE' ? 'badge-live-bronze' : 'text-[10px] px-1.5 py-0.5 rounded-full border border-amber-400/40 text-amber-400 bg-amber-600/10 uppercase font-semibold'}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-amber-600/70 mt-0.5">{item.description}</p>
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
                            <child.icon className="h-3 w-3 text-amber-600/70" />
                            <span className="text-amber-200">{child.label}</span>
                            {child.badge && (
                              <span className={child.badge === 'LIVE' ? 'badge-live-bronze ml-2' : 'ml-2 text-[9px] px-1.5 py-0.5 rounded-full border border-amber-600/50 text-amber-300 bg-[#0f0f0f]/60 uppercase'}>
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
                <div className="px-6 py-8 text-center text-amber-600/70 text-sm">
                  No results found for "<span className="text-amber-200">{searchQuery}</span>"
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

