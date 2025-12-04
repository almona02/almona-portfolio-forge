import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Factory, 
  Cpu, 
  Sparkles, 
  CircuitBoard,
  Brain,
  Menu,
  X,
  ChevronDown,
  BarChart3,
  Settings,
  Zap,
  Ruler,
  Scissors,
  Package,
  User,
  Bell,
  Search,
  Workflow,
  Users,
  FileText,
  Calculator,
  Coins,
  Box,
  LogOut
} from 'lucide-react';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState(3);
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
    { id: 'measuring', name: 'Smart Measuring', icon: Ruler, status: 'active' },
    { id: 'design', name: 'Technical Design', icon: Settings, status: 'pending' },
    { id: 'optimization', name: 'AI Optimization', icon: Sparkles, status: 'pending' },
    { id: 'inventory', name: 'Inventory Check', icon: Package, status: 'pending' },
    { id: 'production', name: 'Production', icon: Factory, status: 'pending' },
    { id: 'quality', name: 'Quality Control', icon: Zap, status: 'pending' }
  ];

  // Fabrication modules with real-time status
  const fabricationModules = [
    {
      name: "Cutting Optimization",
      path: "/fabricator-workflow#optimization",
      icon: <Scissors className="h-4 w-4" />,
      status: "optimal",
      efficiency: "92.5%",
      description: "AI-powered material nesting"
    },
    {
      name: "Machine Control",
      path: "/machines",
      icon: <Cpu className="h-4 w-4" />,
      status: "running",
      efficiency: "87.2%",
      description: "Real-time CNC interface"
    },
    {
      name: "Production Scheduler",
      path: "/fabricator-workflow#production",
      icon: <Workflow className="h-4 w-4" />,
      status: "optimal",
      efficiency: "94.1%",
      description: "Smart job sequencing"
    },
    {
      name: "Quality Control AI",
      path: "/fabricator/quality",
      icon: <Brain className="h-4 w-4" />,
      status: "monitoring",
      efficiency: "96.3%",
      description: "Computer vision inspection"
    },
    {
      name: "Real-time Analytics",
      path: "/fabricator/analytics",
      icon: <BarChart3 className="h-4 w-4" />,
      status: "active",
      efficiency: "100%",
      description: "Live performance metrics"
    }
  ];

  // Business navigation: customers, projects, inventory, etc.
  const businessNav = [
    // Prefer fabricator‑scoped aliases so operators stay inside the cockpit
    { name: "Customers", path: "/fabricator/customers", icon: <Users className="h-4 w-4" /> },
    { name: "Projects", path: "/fabricator/projects", icon: <Factory className="h-4 w-4" /> },
    { name: "Inventory", path: "/fabricator/inventory", icon: <Package className="h-4 w-4" /> },
    { name: "Profiles & Accessories", path: "/fabricator-workflow#inventory", icon: <Scissors className="h-4 w-4" /> },
    { name: "Reports Hub", path: "/fabricator/reports", icon: <BarChart3 className="h-4 w-4" /> },
    { name: "Machines", path: "/machines", icon: <Cpu className="h-4 w-4" /> },
    { name: "Settings & Prices", path: "/pricing-settings", icon: <Settings className="h-4 w-4" /> },
    { name: "Commercial Offers", path: "/offers", icon: <FileText className="h-4 w-4" /> },
    { name: "Cost Reports", path: "/cost-reports", icon: <Calculator className="h-4 w-4" /> },
    { name: "Accounting", path: "/accounting", icon: <Coins className="h-4 w-4" /> },
  ];

  // Quick actions for operators
  const quickActions = [
    { name: "New Project", action: () => navigate('/fabricator-workflow?new=true'), icon: Zap },
    { name: "Machine Status", action: () => navigate('/machine-status'), icon: Factory },
    { name: "Inventory Check", action: () => navigate('/fabricator/inventory'), icon: Package },
    { name: "Reports Hub", action: () => navigate('/fabricator/reports'), icon: BarChart3 }
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
    window.addEventListener('scroll', handleScroll);
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
      active: { color: 'text-orange-400', bg: 'bg-orange-400/20', border: 'border-orange-400/30' },
      pending: { color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/30' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${config.bg} ${config.border} ${config.color}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${config.bg} ${config.color} animate-pulse`} />
        {efficiency ? `${status} • ${efficiency}` : status}
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
      primary: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
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

  // Add ARIA roles and labels to the main navbar structure
  const navigationItems = [
    {
      id: 'workflow',
      label: 'AI Workflow',
      icon: Factory,
      href: '/fabricator-workflow#workflow',
      description: 'End‑to‑end fabrication pipeline',
      children: [
        { id: 'measuring', label: 'Smart Measuring', icon: Ruler, href: '/fabricator-workflow#measuring', badge: 'AI' },
        { id: 'design', label: 'Technical Design', icon: Settings, href: '/fabricator-workflow#design', badge: 'PRO' },
        { id: 'preview3d', label: '3D Preview', icon: Box, href: '/fabricator-workflow#preview3d', badge: '3D' },
        { id: 'optimization', label: 'Cutting Optimization', icon: Scissors, href: '/fabricator-workflow#optimization', badge: 'AI' },
        { id: 'inventory', label: 'Inventory Check', icon: Package, href: '/fabricator-workflow#inventory' },
        { id: 'production', label: 'Production Planning', icon: Factory, href: '/fabricator-workflow#production' },
        { id: 'quality', label: 'Quality Control', icon: Zap, href: '/fabricator-workflow#quality' }
      ]
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: Factory,
      href: '/fabricator/projects',
      description: 'Manage all window units and positions'
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      href: '/fabricator/customers',
      description: 'Client management and portals'
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Package,
      href: '/fabricator/inventory',
      description: 'Stock management and remnants',
      badge: 'LIVE',
      children: [
        { id: 'profiles', label: 'Profiles & Accessories', icon: Scissors, href: '/fabricator-workflow#inventory' },
        { id: 'machines', label: 'Machines', icon: Cpu, href: '/machines' },
        { id: 'accounting', label: 'Accounting', icon: Coins, href: '/accounting' }
      ]
    },
    {
      id: 'commercial',
      label: 'Commercial',
      icon: Calculator,
      description: 'Pricing and offers',
      children: [
        { id: 'offers', label: 'Commercial Offers', icon: FileText, href: '/offers' },
        { id: 'pricing', label: 'Settings & Prices', icon: Calculator, href: '/pricing-settings' },
        { id: 'cost-reports', label: 'Cost Reports', icon: BarChart3, href: '/cost-reports' }
      ]
    },
    {
      id: 'resources',
      label: 'Resources',
      icon: Package,
      description: 'Production assets & machines',
      children: [
        { id: 'machines', label: 'Machines', icon: Cpu, href: '/machines' },
        { id: 'accounting', label: 'Accounting', icon: Coins, href: '/accounting' }
      ]
    }
  ];

  const workflows = [
    { id: 'measuring', label: 'Smart Measuring', icon: Ruler },
    { id: 'design', label: 'Technical Design', icon: Settings },
    { id: 'optimization', label: 'AI Optimization', icon: Sparkles },
    { id: 'inventory', label: 'Inventory Check', icon: Package },
    { id: 'production', label: 'Production', icon: Factory },
    { id: 'quality', label: 'Quality Control', icon: Zap }
  ];

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    // In a real app, you'd dispatch an action to clear auth state
    // navigate('/login'); 
  };

  return (
    <motion.header
      ref={navbarRef}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className={`industrial-nav fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950/90 backdrop-blur-xl border-b border-slate-700/50 shadow-2xl`}
      role="banner"
      aria-label="Main industrial navigation"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          
          {/* Logo with proper ARIA */}
          <Link 
            to="/fabricator" 
            className="flex items-center gap-3 group"
            aria-label="Almona Fabricator Pro - Return to dashboard"
          >
            <motion.div 
              className="relative"
              whileHover={{ scale: 1.05 }}
            >
              <Factory className="h-8 w-8 text-orange-500 drop-shadow-lg" />
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full blur opacity-20 animate-ping group-hover:opacity-30" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Fabricator Pro</h1>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Industrial OS</p>
            </div>
          </Link>

          {/* Desktop Navigation with ARIA */}
          <nav 
            className="hidden md:flex items-center gap-1"
            role="navigation"
            aria-label="Main navigation"
          >
            {navigationItems.map((item, index) => (
              <motion.div
                key={item.id}
                className="relative group"
                whileHover={{ y: -1 }}
                role="none"
              >
                <Link
                  to={item.href}
                  className={cn(
                    "industrial-nav-link flex items-center gap-2 py-2 px-4 rounded-lg transition-all duration-200 relative z-10",
                    location.pathname === item.href && "active"
                  )}
                  aria-label={`Navigate to ${item.label}`}
                  aria-current={location.pathname === item.href ? "page" : undefined}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <StatusBadge 
                      status={item.badge} 
                      efficiency={item.efficiency}
                      aria-label={`${item.badge} status indicator`}
                    />
                  )}
                </Link>
                
                {/* Dropdown with proper ARIA */}
                {item.children && (
                  <motion.div
                    className="absolute left-0 top-full mt-2 w-64 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible pointer-events-none group-hover:pointer-events-auto transition-all duration-200 z-50"
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    whileHover={{ opacity: 1, scale: 1, y: 0 }}
                    role="menu"
                    aria-label={`${item.label} submenu`}
                  >
                    <div className="py-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.id}
                          to={child.href}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors w-full"
                          role="menuitem"
                          aria-label={`Navigate to ${child.label}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <child.icon className="h-4 w-4 flex-shrink-0 text-orange-400" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{child.label}</p>
                            {child.description && (
                              <p className="text-xs text-slate-400 truncate">{child.description}</p>
                            )}
                          </div>
                          {child.badge && (
                            <StatusBadge 
                              status={child.badge} 
                              efficiency={child.efficiency}
                              aria-label={`${child.badge} efficiency indicator`}
                            />
                          )}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}

            {/* Workflow Switcher with ARIA */}
            <div className="relative ml-4">
              <Select 
                value={currentWorkflow} 
                onValueChange={(value) => {
                  onWorkflowChange?.(value);
                  setTimeout(() => {
                    const element = document.getElementById(value);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 100);
                }}
                aria-label="Switch current workflow module"
              >
                <SelectTrigger className="w-[180px] bg-slate-800/50 border-slate-600 text-white">
                  <SelectValue placeholder="Select Workflow" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800/95 backdrop-blur-xl border-slate-700/50">
                  {workflows.map((workflow) => (
                    <SelectItem 
                      key={workflow.id} 
                      value={workflow.id}
                      className="text-white hover:bg-slate-700/50"
                      aria-label={`Switch to ${workflow.label} workflow`}
                    >
                      <div className="flex items-center gap-2">
                        <workflow.icon className="h-4 w-4" />
                        {workflow.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </nav>

          {/* Right side controls with ARIA */}
          <div className="flex items-center gap-2">
            {/* Search button */}
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700/50"
              aria-label="Open global search"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Notifications button */}
            <Button
              variant="ghost"
              size="sm"
              className="relative text-slate-400 hover:text-white hover:bg-slate-700/50"
              aria-label="View notifications"
              aria-haspopup="true"
            >
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500" 
                      aria-label={`${notifications} unread notifications`} />
              )}
            </Button>

            {/* User menu with ARIA */}
            <motion.div className="relative" whileHover={{ scale: 1.05 }}>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-700/50"
                aria-label="Open user menu"
                aria-haspopup="true"
                aria-expanded={isUserMenuOpen}
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">{user?.name || 'User'}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </Button>

              {/* User menu dropdown */}
              <motion.div
                className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl rounded-xl border border-slate-700/50 shadow-2xl opacity-0 invisible pointer-events-none"
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={isUserMenuOpen ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                role="menu"
                aria-label="User account menu"
              >
                <div className="py-1">
                  <motion.div
                    role="menuitem"
                    className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 cursor-pointer flex items-center gap-2"
                    onClick={() => {
                      // Profile action
                      setIsUserMenuOpen(false);
                    }}
                    whileHover={{ x: 2 }}
                    aria-label="View user profile"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </motion.div>
                  
                  <motion.div
                    role="menuitem"
                    className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 cursor-pointer flex items-center gap-2 border-t border-slate-600"
                    onClick={() => {
                      // Settings action
                      setIsUserMenuOpen(false);
                    }}
                    whileHover={{ x: 2 }}
                    aria-label="Open settings"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </motion.div>

                  <motion.div
                    role="menuitem"
                    className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/50 cursor-pointer flex items-center gap-2 border-t border-slate-600"
                    onClick={handleLogout}
                    whileHover={{ x: 2 }}
                    aria-label="Sign out of account"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-slate-400 hover:text-white hover:bg-slate-700/50"
              aria-label={isMobileMenuOpen ? "Close mobile menu" : "Open mobile menu"}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu with proper ARIA */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="md:hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            role="navigation"
            aria-label="Mobile navigation menu"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 px-4 py-4 space-y-2">
              {navigationItems.map((item) => (
                <div key={item.id} className="py-2">
                  <Link
                    to={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-label={`Navigate to ${item.label}`}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <StatusBadge 
                        status={item.badge} 
                        efficiency={item.efficiency}
                        aria-label={`${item.badge} status indicator`}
                      />
                    )}
                  </Link>
                  
                  {item.children && (
                    <div className="ml-6 mt-2 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.id}
                          to={child.href}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-700/50 hover:text-white rounded transition-colors"
                          onClick={() => setIsMobileMenuOpen(false)}
                          aria-label={`Navigate to ${child.label}`}
                        >
                          <child.icon className="h-4 w-4" />
                          <span>{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Scanning Line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent"
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
                <Search className="h-4 w-4 text-orange-400" />
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
                        <item.icon className="h-4 w-4 text-orange-400" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-100">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-orange-500/40 text-orange-300 bg-orange-500/10 uppercase font-semibold">
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