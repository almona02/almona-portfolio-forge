import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { AlmonaNavbarLogo } from '@/components/ui/AlmonaNavbarLogo';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { AnimatePresence, motion } from 'framer-motion';
import {
    BarChart3,
    Bell,
    Box,
    Brain,
    Calculator,
    ChevronDown,
    CircuitBoard,
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
    User,
    Users,
    Workflow,
    X,
    Zap
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface IndustrialNavbarProps {
  user?: {
    name: string;
    email: string;
    role: 'operator' | 'supervisor' | 'admin';
  };
  currentWorkflow?: string;
  onWorkflowChange?: (workflow: string) => void;
}

const FabricatorNavbar: React.FC<IndustrialNavbarProps> = ({ 
  user,
  currentWorkflow = 'measuring',
  onWorkflowChange
}) => {
  const { t } = useTranslation(['fabricator', 'translation']);
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications] = useState(3);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navbarRef = useRef<HTMLElement>(null);
  const { branding } = useCompanyBranding();

  const cockpitOwner =
    branding.workshopName?.trim() ||
    branding.companyName?.trim() ||
    'Fabricator';

  // Workflow stages for quick navigation
  const workflowStages = [
    { id: 'measuring', name: t('fabricator:workflow.steps.measuring.name', 'Smart Measuring'), icon: Ruler, status: 'active' },
    { id: 'design', name: t('fabricator:workflow.steps.design.name', 'Technical Design'), icon: Settings, status: 'pending' },
    { id: 'optimization', name: t('fabricator:workflow.steps.optimization.name', 'AI Optimization'), icon: Sparkles, status: 'pending' },
    { id: 'inventory', name: t('fabricator:workflow.steps.inventory.name', 'Inventory Check'), icon: Package, status: 'pending' },
    { id: 'production', name: t('fabricator:workflow.steps.production.name', 'Production'), icon: Factory, status: 'pending' },
    { id: 'quality', name: t('fabricator:workflow.steps.quality.name', 'Quality Control'), icon: Zap, status: 'pending' }
  ];

  // Fabrication modules with real-time status
  const fabricationModules = [
    {
      name: t('fabricator:navbar.fabrication_modules.cutting_optimization.name', 'Cutting Optimization'),
      path: "/fabricator-workflow#optimization",
      icon: <Scissors className="h-4 w-4" />,
      status: "optimal",
      efficiency: "92.5%",
      description: t('fabricator:navbar.fabrication_modules.cutting_optimization.description', 'AI-powered material nesting')
    },
    {
      name: t('fabricator:navbar.fabrication_modules.machine_control.name', 'Machine Control'),
      path: "/machines",
      icon: <Cpu className="h-4 w-4" />,
      status: "running",
      efficiency: "87.2%",
      description: t('fabricator:navbar.fabrication_modules.machine_control.description', 'Real-time CNC interface')
    },
    {
      name: t('fabricator:navbar.fabrication_modules.production_scheduler.name', 'Production Scheduler'),
      path: "/fabricator-workflow#production",
      icon: <Workflow className="h-4 w-4" />,
      status: "optimal",
      efficiency: "94.1%",
      description: t('fabricator:navbar.fabrication_modules.production_scheduler.description', 'Smart job sequencing')
    },
    {
      name: t('fabricator:navbar.fabrication_modules.quality_control_ai.name', 'Quality Control AI'),
      path: "/fabricator/quality",
      icon: <Brain className="h-4 w-4" />,
      status: "monitoring",
      efficiency: "96.3%",
      description: t('fabricator:navbar.fabrication_modules.quality_control_ai.description', 'Computer vision inspection')
    },
    {
      name: t('fabricator:navbar.fabrication_modules.real_time_analytics.name', 'Real-time Analytics'),
      path: "/fabricator/analytics",
      icon: <BarChart3 className="h-4 w-4" />,
      status: "active",
      efficiency: "100%",
      description: t('fabricator:navbar.fabrication_modules.real_time_analytics.description', 'Live performance metrics')
    }
  ];

  // Business navigation: customers, projects, inventory, etc.
  const businessNav = [
    // Prefer fabricator‑scoped aliases so operators stay inside the cockpit
    { name: t('fabricator:navbar.business_nav.customers', 'Customers'), path: "/fabricator/customers", icon: <Users className="h-4 w-4" /> },
    { name: t('fabricator:navbar.business_nav.projects', 'Projects'), path: "/fabricator/studio/projects", icon: <Factory className="h-4 w-4" /> },
    { name: t('fabricator:navbar.business_nav.inventory', 'Inventory'), path: "/fabricator/inventory", icon: <Package className="h-4 w-4" /> },
    { name: t('fabricator:navbar.business_nav.profiles', 'Profiles & Accessories'), path: "/fabricator-workflow#inventory", icon: <Scissors className="h-4 w-4" /> },
    { name: t('fabricator:navbar.business_nav.quick_reports', 'Quick Reports'), path: "/reports", icon: <FileText className="h-4 w-4" /> },
    { name: t('fabricator:navbar.business_nav.machines', 'Machines'), path: "/machines", icon: <Cpu className="h-4 w-4" /> },
    { name: t('fabricator:navbar.business_nav.settings_prices', 'Settings & Prices'), path: "/pricing-settings", icon: <Settings className="h-4 w-4" /> },
    { name: t('fabricator:navbar.business_nav.commercial_offers', 'Commercial Offers'), path: "/offers", icon: <FileText className="h-4 w-4" /> },
    { name: t('fabricator:navbar.business_nav.cost_reports', 'Cost Reports'), path: "/cost-reports", icon: <Calculator className="h-4 w-4" /> },
    { name: t('fabricator:navbar.business_nav.accounting', 'Accounting'), path: "/accounting", icon: <Coins className="h-4 w-4" /> },
  ];

  // Quick actions for operators
  const quickActions = [
    { name: t('fabricator:navbar.quick_actions.new_project', 'New Project'), action: () => navigate('/fabricator-workflow?new=true'), icon: Zap },
    { name: t('fabricator:navbar.quick_actions.profile_tuning', 'Profile Tuning Studio'), action: () => navigate('/fabricator/profiles?tuning=studio'), icon: Sparkles },
    { name: t('fabricator:navbar.quick_actions.machine_status', 'Machine Status'), action: () => navigate('/machine-status'), icon: Factory },
    { name: t('fabricator:navbar.quick_actions.inventory_check', 'Inventory Check'), action: () => navigate('/fabricator/inventory'), icon: Package },
    { name: t('fabricator:navbar.quick_actions.quality_reports', 'Quality Reports'), action: () => navigate('/quality-reports'), icon: Brain }
  ];

  // Global fabricator nav model – used by the search overlay
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
      path: '/fabricator/studio/projects',
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

  const filteredNavItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();

    const matches: NavItem[] = [];

    fabricatorNavItems.forEach((item) => {
      const itemMatches =
        item.label.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));

      const matchingChildren = (item.children || []).filter(
        (child) =>
          child.label.toLowerCase().includes(q) ||
          (child.description && child.description.toLowerCase().includes(q))
      );

      if (itemMatches || matchingChildren.length > 0) {
        if (matchingChildren.length > 0) {
          matches.push({ ...item, children: matchingChildren });
        } else {
          matches.push(item);
        }
      }
    });

    return matches;
  }, [fabricatorNavItems, searchQuery]);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Status badge component
  const StatusBadge: React.FC<{ status: string; efficiency?: string }> = ({ status, efficiency }) => {
    const statusConfig = {
      optimal: { color: 'text-green-400', bg: 'bg-green-400/20', border: 'border-green-400/30' },
      running: { color: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400/30' },
      monitoring: { color: 'text-purple-400', bg: 'bg-purple-400/20', border: 'border-purple-400/30' },
      active: { color: 'text-amber-400', bg: 'bg-amber-400/20', border: 'border-amber-400/30' },
      pending: { color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/30' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const statusLabel = t(`fabricator:navbar.status.${status}`, status);

    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${config.bg} ${config.border} ${config.color}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${config.bg} ${config.color} animate-pulse`} />
        {efficiency ? `${statusLabel} • ${efficiency}` : statusLabel}
      </div>
    );
  };

  // Industrial Button Component
  const IndustrialButton: React.FC<{
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    className?: string;
  }> = ({ children, onClick, variant = 'primary', className = '' }) => {
    const variants = {
      primary: 'bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600',
      secondary: 'bg-gray-800 border border-gray-600 hover:bg-gray-700',
      danger: 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
    };

    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`
          relative px-4 py-2.5 text-white font-semibold rounded-lg overflow-hidden 
          group transition-all duration-300 text-sm backdrop-blur-sm
          ${variants[variant]} ${className}
        `}
      >
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6 }}
        />
      </motion.button>
    );
  };

  return (
    <motion.header
      ref={navbarRef}
      dir="ltr"
      style={{ direction: 'ltr' }}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-500 ${
        isScrolled
          ? 'bg-slate-950/95 backdrop-blur-xl border-b border-amber-500/30 shadow-2xl shadow-amber-500/10'
          : 'bg-slate-950/90 backdrop-blur-lg border-b border-slate-800'
      }`}
    >
      {/* Main Navbar Container */}
      <div className="container mx-auto px-4 xl:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left Section – Brand + workflow access */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link to="/" className="flex items-center gap-3 group">
              <AlmonaNavbarLogo size={36} />
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-[0.18em] bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent uppercase">
                  ALMONA
                </span>
                <span className="text-[11px] font-semibold text-amber-600/90">
                  {cockpitOwner} Cockpit
                </span>
              </div>
            </Link>

            {/* Workflow dropdown – easier to reach on wide screens */}
            <motion.div className="relative hidden md:block">
              <IndustrialButton
                variant="secondary"
                onClick={() => setActiveMenu(activeMenu === 'workflow' ? null : 'workflow')}
                className="px-3 py-1.5 text-[11px] rounded-full"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">
                  {workflowStages.find((s) => s.id === currentWorkflow)?.name || 'Smart Measuring'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    activeMenu === 'workflow' ? 'rotate-180' : ''
                  }`}
                />
              </IndustrialButton>

              <AnimatePresence>
                {activeMenu === 'workflow' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-gray-800/95 border 500/30 rounded-xl shadow-2xl shadow-amber-500/20 overflow-hidden z-50 card-glass-dark"
                  >
                    <div className="p-3 space-y-1">
                      {workflowStages.map((stage) => {
                        const isActive = currentWorkflow === stage.id;
                        return (
                          <button
                            key={stage.id}
                            type="button"
                            onClick={() => {
                              onWorkflowChange?.(stage.id);
                              setActiveMenu(null);
                            }}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] transition-colors ${
                              isActive
                                ? 'bg-amber-500/90 text-slate-950'
                                : 'text-slate-200 hover:bg-amber-500/10'
                            }`}
                          >
                            <stage.icon className="w-3.5 h-3.5" />
                            <span className="whitespace-nowrap">{stage.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Center Section – status strip (visible on large screens) */}
          <div className="hidden lg:flex items-center justify-center flex-1">
            <div className="inline-flex items-center gap-4 rounded-full bg-slate-950/70 px-3 py-1.5 border border-slate-700/80 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse status-valid" />
                <span className="text-slate-300">System</span>
                <span className="font-semibold text-emerald-300">Optimal</span>
              </div>
              <div className="btn-secondary" />
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-slate-300">Efficiency</span>
                <span className="font-semibold text-sky-300">92.5%</span>
              </div>
              <div className="btn-secondary" />
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-slate-300">Active Jobs</span>
                <span className="font-semibold text-amber-300">12</span>
              </div>
            </div>
          </div>

          {/* Right Section – search, menus, user */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Search Bar with global fabricator search overlay - Hidden on fabricator routes */}
            {!location.pathname.startsWith('/fabricator') && (
              <div className="hidden md:flex items-center relative">
                <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search machines, orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-full border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber- 400 focus:ring-1 focus:ring-amber-400/60 w-60 card-premium"
                />
              </div>
            )}

            {/* Language Switcher - Compact */}
            <div className="hidden md:block">
              <LanguageSwitcher variant="icons" />
            </div>

            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 rounded-full border border-slate-700 text-slate-200 hover:border-amber- 400/70 hover:text-white transition-all card-premium"
            >
              <Bell className="w-4 h-4" />
              {notifications > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center"
                >
                  {notifications}
                </motion.div>
              )}
            </motion.button>

            {/* Business Navigation Dropdown */}
            <motion.div className="relative">
              <IndustrialButton
                variant="secondary"
                onClick={() => setActiveMenu(activeMenu === 'business' ? null : 'business')}
                className="px-3 py-1.5 text-[11px] rounded-full"
              >
                <Workflow className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">
                  {t('fabricator:navbar.fabricator_menu', 'Fabricator Menu')}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    activeMenu === 'business' ? 'rotate-180' : ''
                  }`}
                />
              </IndustrialButton>

              <AnimatePresence>
                {activeMenu === 'business' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-[420px] bg-gray-800/95 border 500/30 rounded-xl shadow-2xl shadow-amber-500/20 overflow-hidden z-50 card-glass-dark"
                  >
                    <div className="p-4 grid grid-cols-2 gap-2">
                      {businessNav.map((item) => (
                        <Link
                          key={item.name}
                          to={item.path}
                          className="btn-primary"
                          onClick={() => setActiveMenu(null)}
                        >
                          <div className="text-amber-400">{item.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate text-sm">{item.name}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Fabrication Modules Dropdown */}
            <motion.div className="relative">
              <IndustrialButton
                onClick={() => setActiveMenu(activeMenu === 'modules' ? null : 'modules')}
                className="px-3 py-1.5 text-[11px] rounded-full"
              >
                <CircuitBoard className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">
                  {t('fabricator:navbar.modules_label', 'Modules')}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    activeMenu === 'modules' ? 'rotate-180' : ''
                  }`}
                />
              </IndustrialButton>

              <AnimatePresence>
                {activeMenu === 'modules' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-96 bg-gray-800/95 border 500/30 rounded-xl shadow-2xl shadow-amber-500/20 overflow-hidden z-50 card-glass-dark"
                  >
                    <div className="p-4">
                      <h3 className="typography-h3 text-amber-400 mb-3 flex items-center gap-2">
                        <Cpu className="w-4 h-4" />
                        {t('fabricator:navbar.fabrication_modules_title', 'Fabrication Modules')}
                      </h3>
                      <div className="space-y-2">
                        {fabricationModules.map((module) => (
                          <Link
                            key={module.name}
                            to={module.path}
                            className="btn-primary"
                            onClick={() => setActiveMenu(null)}
                          >
                            <div className="text-amber-400 group-hover:scale-110 transition-transform">
                              {module.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-white truncate">{module.name}</div>
                                <StatusBadge status={module.status} efficiency={module.efficiency} />
                              </div>
                              <div className="text-sm text-gray-400 truncate">{module.description}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Quick Actions */}
            <motion.div className="relative">
              <IndustrialButton
                variant="secondary"
                onClick={() => setActiveMenu(activeMenu === 'actions' ? null : 'actions')}
                className="px-3 py-1.5 text-[11px] rounded-full"
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">
                  {t('fabricator:navbar.actions_label', 'Actions')}
                </span>
              </IndustrialButton>

              <AnimatePresence>
                {activeMenu === 'actions' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-gray-800/95 border 500/30 rounded-xl shadow-2xl shadow-amber-500/20 overflow-hidden z-50 card-glass-dark"
                  >
                    <div className="p-2">
                      {quickActions.map((action) => (
                        <button
                          key={action.name}
                          onClick={() => {
                            action.action();
                            setActiveMenu(null);
                          }}
                          className="btn-primary"
                        >
                          <action.icon className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                          <span className="text-white font-medium">{action.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* User Menu */}
            <motion.div className="relative">
              <IndustrialButton
                variant="secondary"
                onClick={() => setActiveMenu(activeMenu === 'user' ? null : 'user')}
                className="px-3 py-1.5 text-[11px] rounded-full"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{user?.name || 'Operator'}</span>
              </IndustrialButton>

              <AnimatePresence>
                {activeMenu === 'user' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-gray-800/95 border 500/30 rounded-xl shadow-2xl shadow-amber-500/20 overflow-hidden z-50 card-glass-dark"
                  >
                    <div className="p-2">
                      <div className="px-3 py-2 border-b border-gray-700">
                        <div className="text-white font-medium">{user?.name || 'Operator'}</div>
                        <div className="text-sm text-gray-400">
                          {user?.email || 'operator@fabricator.com'}
                        </div>
                      </div>
                      <button
                        className="btn-primary"
                        onClick={() => {
                          navigate('/fabricator/settings/branding');
                          setActiveMenu(null);
                        }}
                      >
                        <Settings className="w-4 h-4 text-amber-400" />
                        <span className="text-white">Branding & Settings</span>
                      </button>
                      <button className="flex items-center gap-2 w-full p-3 rounded-lg hover:bg-red-500/10 transition-all duration-200 text-red-400">
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-full border border-slate-700 text-slate-300 hover:text-white hover:border-amber- 400/70 transition-all card-premium"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-slate-950/95 border-t 500/30 card-glass-dark"
          >
            <div className="container mx-auto px-4 py-4 max-h-[78vh] overflow-y-auto space-y-4">
              {/* Mobile Workflow Navigation */}
              <div className="grid grid-cols-2 gap-2">
                {workflowStages.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => {
                      onWorkflowChange?.(stage.id);
                      setMobileOpen(false);
                    }}
                    className={`flex items-center gap-2 p-3 rounded-lg transition-all ${
                      currentWorkflow === stage.id
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-gray-800 text-gray-300 border border-gray-700 hover:text-white hover:border-amber-400/40'
                    }`}
                  >
                    <stage.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium text-left">{stage.name}</span>
                  </button>
                ))}
              </div>

              {/* Mobile Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.name}
                    onClick={() => {
                      action.action();
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-amber-500/30 transition-all"
                  >
                    <action.icon className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-left">{action.name}</span>
                  </button>
                ))}
              </div>

              {/* Mobile Navigation Links (scrollable) */}
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Navigation</div>
                {fabricatorNavItems.map((item) => (
                  <div key={item.id} className="border border-slate-800/70 rounded-lg overflow-hidden">
                    <Link
                      to={item.path || '#'}
                      className="flex items-center gap-3 px-3 py-3 text-slate-200 hover:bg-slate-800/70 transition-colors"
                      onClick={() => {
                        setMobileOpen(false);
                        if (item.path?.startsWith('/fabricator-workflow#')) {
                          const id = item.path.split('#')[1];
                          if (id) onWorkflowChange?.(id);
                        }
                      }}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0 text-amber-400" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{item.label}</div>
                        {item.description && <div className="text-xs text-slate-400 truncate">{item.description}</div>}
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </Link>

                    {item.children && item.children.length > 0 && (
                      <div className="border-t border-slate-800/70 bg-slate-900/40">
                        {item.children.map((child) => (
                          <Link
                            key={child.id}
                            to={child.path || '#'}
                            className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
                            onClick={() => {
                              setMobileOpen(false);
                              if (child.path?.startsWith('/fabricator-workflow#')) {
                                const id = child.path.split('#')[1];
                                if (id) onWorkflowChange?.(id);
                              }
                            }}
                          >
                            <child.icon className="w-4 h-4 flex-shrink-0 text-amber-300" />
                            <span className="text-sm">{child.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Scanning Line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
        animate={{
          scaleX: [0, 1, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Global fabricator search results overlay */}
      <AnimatePresence>
        {searchQuery && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 z-[190] mt-2 px-4 md:px-6"
          >
            <div className="mx-auto max-w-5xl bg-slate-950/98 border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-xl">
              <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
                <Search className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-semibold text-slate-100">
                  Search Fabricator Pro
                </span>
                <span className="ml-auto text-[11px] text-slate-500">
                  {filteredNavItems.length} matches
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {filteredNavItems.length > 0 ? (
                  filteredNavItems.map((item) => (
                    <div
                      key={item.id}
                      className="border-b border-slate-800/60 last:border-b-0"
                    >
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
                        <item.icon className="h-4 w-4 text-amber-400" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-100">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className={item.badge === 'LIVE' ? 'badge-live-bronze' : 'btn-primary'}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {item.description}
                            </p>
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
                              <span className="text-slate-200">
                                {child.label}
                              </span>
                              {child.badge && (
                                <span className={child.badge === 'LIVE' ? 'badge-live-bronze ml-2' : 'ml-2 text-[9px] px-1.5 py-0.5 rounded-full border border-slate-600 text-slate-300 bg-slate-800/60 uppercase'}>
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
                    No fabricator modules found for "
                    <span className="text-slate-200">{searchQuery}</span>".
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default FabricatorNavbar;