import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  Workflow
} from 'lucide-react';

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const location = useLocation();
  const navbarRef = useRef<HTMLElement>(null);

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
      path: "/fabricator/cutting",
      icon: <Scissors className="h-4 w-4" />,
      status: "optimal",
      efficiency: "92.5%",
      description: "AI-powered material nesting"
    },
    {
      name: "Machine Control",
      path: "/fabricator/machine-control",
      icon: <Cpu className="h-4 w-4" />,
      status: "running",
      efficiency: "87.2%",
      description: "Real-time CNC interface"
    },
    {
      name: "Production Scheduler",
      path: "/fabricator/scheduler",
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

  // Quick actions for operators
  const quickActions = [
    { name: "New Project", action: () => window.location.href = '/fabricator-workflow?new=true', icon: Zap },
    { name: "Machine Status", action: () => window.location.href = '/machine-status', icon: Factory },
    { name: "Inventory Check", action: () => window.location.href = '/inventory', icon: Package },
    { name: "Quality Reports", action: () => window.location.href = '/quality-reports', icon: Brain }
  ];

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

  return (
    <motion.header
      ref={navbarRef}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-gray-900/95 backdrop-blur-xl border-b border-orange-500/30 shadow-2xl shadow-orange-500/10' 
          : 'bg-gray-900/90 backdrop-blur-lg border-b border-gray-800'
      }`}
    >
      {/* Main Navbar Container */}
      <div className="container mx-auto px-4 xl:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Section - Brand & Workflow */}
          <div className="flex items-center gap-6 flex-shrink-0">
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl rotate-45 group-hover:rotate-90 transition-transform duration-500" />
                <Factory className="absolute inset-0 m-auto text-white w-5 h-5 -rotate-45" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                  FABRICATOR PRO
                </span>
                <span className="text-xs text-gray-400 tracking-widest">
                  AI WORKFLOW v4.0
                </span>
              </div>
            </Link>

            {/* Workflow Progress - Desktop */}
            <div className="hidden lg:flex items-center gap-1">
              {workflowStages.map((stage, index) => (
                <React.Fragment key={stage.id}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onWorkflowChange?.(stage.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                      currentWorkflow === stage.id
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <stage.icon className="w-4 h-4" />
                    <span className="text-sm font-medium whitespace-nowrap">{stage.name}</span>
                  </motion.button>
                  {index < workflowStages.length - 1 && (
                    <div className="w-4 h-px bg-gray-600 mx-1" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Center Section - Quick Stats */}
          <div className="hidden xl:flex items-center gap-6 flex-1 justify-center">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-gray-300">System:</span>
                <span className="text-green-400 font-semibold">Optimal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-gray-300">Efficiency:</span>
                <span className="text-blue-400 font-semibold">92.5%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                <span className="text-gray-300">Active Jobs:</span>
                <span className="text-orange-400 font-semibold">12</span>
              </div>
            </div>
          </div>

          {/* Right Section - Actions & User */}
          <div className="flex items-center gap-3 flex-shrink-0">
            
            {/* Search Bar */}
            <div className="hidden md:flex items-center relative">
              <Search className="absolute left-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search machines, orders..."
                className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors w-64"
              />
            </div>

            {/* Notifications */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 rounded-lg bg-gray-800 hover:bg-orange-500/10 border border-gray-700 hover:border-orange-500/30 transition-all duration-300"
            >
              <Bell className="w-5 h-5 text-gray-300" />
              {notifications > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                >
                  {notifications}
                </motion.div>
              )}
            </motion.button>

            {/* Fabrication Modules Dropdown */}
            <motion.div className="relative">
              <IndustrialButton
                onClick={() => setActiveMenu(activeMenu === 'modules' ? null : 'modules')}
              >
                <CircuitBoard className="w-4 h-4" />
                <span className="hidden lg:inline">Modules</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${
                  activeMenu === 'modules' ? 'rotate-180' : ''
                }`} />
              </IndustrialButton>

              <AnimatePresence>
                {activeMenu === 'modules' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-96 bg-gray-800/95 backdrop-blur-xl border border-orange-500/30 rounded-xl shadow-2xl shadow-orange-500/20 overflow-hidden z-50"
                  >
                    <div className="p-4">
                      <h3 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
                        <Cpu className="w-4 h-4" />
                        Fabrication Modules
                      </h3>
                      <div className="space-y-2">
                        {fabricationModules.map((module) => (
                          <Link
                            key={module.name}
                            to={module.path}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-orange-500/10 transition-all duration-200 group"
                            onClick={() => setActiveMenu(null)}
                          >
                            <div className="text-orange-400 group-hover:scale-110 transition-transform">
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
              >
                <Zap className="w-4 h-4" />
                <span className="hidden lg:inline">Actions</span>
              </IndustrialButton>

              <AnimatePresence>
                {activeMenu === 'actions' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-gray-800/95 backdrop-blur-xl border border-orange-500/30 rounded-xl shadow-2xl shadow-orange-500/20 overflow-hidden z-50"
                  >
                    <div className="p-2">
                      {quickActions.map((action) => (
                        <button
                          key={action.name}
                          onClick={() => {
                            action.action();
                            setActiveMenu(null);
                          }}
                          className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-orange-500/10 transition-all duration-200 group"
                        >
                          <action.icon className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
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
                className="px-3"
              >
                <User className="w-4 h-4" />
                <span className="hidden lg:inline">{user?.name || 'Operator'}</span>
              </IndustrialButton>

              <AnimatePresence>
                {activeMenu === 'user' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-gray-800/95 backdrop-blur-xl border border-orange-500/30 rounded-xl shadow-2xl shadow-orange-500/20 overflow-hidden z-50"
                  >
                    <div className="p-2">
                      <div className="px-3 py-2 border-b border-gray-700">
                        <div className="text-white font-medium">{user?.name || 'Operator'}</div>
                        <div className="text-sm text-gray-400">{user?.email || 'operator@fabricator.com'}</div>
                      </div>
                      <button className="flex items-center gap-2 w-full p-3 rounded-lg hover:bg-orange-500/10 transition-all duration-200">
                        <Settings className="w-4 h-4 text-orange-400" />
                        <span className="text-white">Settings</span>
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
              className="lg:hidden p-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-all duration-300"
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
            className="lg:hidden bg-gray-900/95 backdrop-blur-xl border-t border-orange-500/30"
          >
            <div className="container mx-auto px-4 py-4">
              {/* Mobile Workflow Navigation */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {workflowStages.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => {
                      onWorkflowChange?.(stage.id);
                      setMobileOpen(false);
                    }}
                    className={`flex items-center gap-2 p-3 rounded-lg transition-all ${
                      currentWorkflow === stage.id
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                  >
                    <stage.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{stage.name}</span>
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
                    className="flex items-center gap-2 p-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-orange-500/30 transition-all"
                  >
                    <action.icon className="w-4 h-4 text-orange-400" />
                    <span className="text-sm font-medium">{action.name}</span>
                  </button>
                ))}
              </div>
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
          ease: "easeInOut",
        }}
      />
    </motion.header>
  );
};

export default FabricatorNavbar;