import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  Cpu, 
  Factory, 
  CircuitBoard,
  Brain,
  Menu,
  X,
  ChevronDown,
  ShoppingCart,
  User,
  ArrowLeft,
  Home
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';

const IndustrialNavbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navbarRef = useRef<HTMLElement>(null);

  // Advanced cursor tracking for industrial holographic effects
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const smoothX = useSpring(cursorX, { damping: 30, stiffness: 300 });
  const smoothY = useSpring(cursorY, { stiffness: 300, damping: 30 });
  
  const hologramOpacity = useTransform(
    [smoothX, smoothY],
    ([x, y]) => Math.sin(Number(x) * 0.01) * Math.cos(Number(y) * 0.01) * 0.3 + 0.7
  );

  // Industrial menu configurations
  const fabricationModules = [
    {
      name: "Fabricator Workflow Pro",
      path: "/fabricator-workflow",
      icon: <Factory className="h-4 w-4" />,
      description: "Complete AI-powered fabrication system",
      badge: "PRO"
    },
    {
      name: "AI Cutting Optimizer",
      path: "/fabricator/cutting",
      icon: <Sparkles className="h-4 w-4" />,
      description: "Smart material nesting & waste reduction",
      badge: "AI"
    },
    {
      name: "3D Machine Control",
      path: "/fabricator/machine-control",
      icon: <Cpu className="h-4 w-4" />,
      description: "Real-time CNC machine interface",
      badge: "3D"
    },
    {
      name: "Production Scheduler",
      path: "/fabricator/scheduler",
      icon: <CircuitBoard className="h-4 w-4" />,
      description: "Smart job sequencing & resource allocation"
    },
    {
      name: "Quality Control AI",
      path: "/fabricator/quality",
      icon: <Brain className="h-4 w-4" />,
      description: "Computer vision inspection system",
      badge: "CV"
    }
  ];


  // CNC Machine-inspired navigation
  const mainNavigation = [
    { name: "Factory Floor", path: "/factory", icon: <Factory /> },
    { name: "Material Hub", path: "/materials", icon: <CircuitBoard /> },
    { name: "Project Gallery", path: "/gallery", icon: <Sparkles /> },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [cursorX, cursorY]);

  const IndustrialHologramEffect = () => (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(circle at ${smoothX}px ${smoothY}px, 
            rgba(59, 130, 246, 0.1) 0%,
            rgba(16, 185, 129, 0.05) 30%,
            transparent 70%
          )
        `,
        opacity: hologramOpacity
      }}
    />
  );

  interface PlasmaButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }

  const PlasmaButton = ({ children, onClick, className = '' }: PlasmaButtonProps) => (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative px-6 py-3 bg-gradient-to-r from-blue-600 via-green-500 to-cyan-400 
        text-white font-bold rounded-lg overflow-hidden group
        ${className}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 group-hover:from-blue-500 group-hover:to-cyan-400 transition-all duration-300" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
      <span className="relative z-10 flex items-center gap-2">
        {children}
      </span>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6 }}
      />
    </motion.button>
  );

  return (
    <motion.header
      ref={navbarRef}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-gray-900/95 backdrop-blur-xl border-b border-cyan-500/20 shadow-2xl'
          : 'bg-gray-900/80 backdrop-blur-lg'
      }`}
    >
      {/* Advanced Holographic Effects */}
      <IndustrialHologramEffect />
      
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="container mx-auto px-4 xl:px-6 2xl:px-8 relative">
        <div className="flex items-center justify-between h-20 xl:h-24">
          {/* CNC-Inspired Logo with Back Button */}
          <motion.div 
            className="flex items-center gap-3 xl:gap-6"
            whileHover={{ scale: 1.02 }}
          >
            {/* Back to Almona Forge Button - Responsive sizing */}
            <Link 
              to="/" 
              className="flex items-center gap-2 px-2 py-1.5 xl:px-3 xl:py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg transition-all duration-300 group"
            >
              <ArrowLeft className="h-3 w-3 xl:h-4 xl:w-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs xl:text-sm font-medium hidden sm:inline">Back to Almona Forge</span>
              <span className="text-xs xl:text-sm font-medium sm:hidden">Back</span>
            </Link>
            
            <Link to="/" className="flex items-center gap-3 xl:gap-4 group">
              <div className="relative">
                <div className="w-10 h-10 xl:w-12 xl:h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl rotate-45 group-hover:rotate-90 transition-transform duration-500" />
                <Cpu className="absolute inset-0 m-auto text-white w-5 h-5 xl:w-6 xl:h-6 -rotate-45" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg xl:text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  FABRICATOR PRO
                </span>
                <span className="text-xs text-gray-400 tracking-widest">
                  INDUSTRIAL AI v4.0
                </span>
              </div>
            </Link>
          </motion.div>

          {/* Central Navigation - CNC Control Panel Style */}
          <nav className="hidden lg:flex items-center gap-2 xl:gap-3">
            {mainNavigation.map((item) => (
              <motion.div
                key={item.name}
                className="relative"
                onHoverStart={() => setActiveMenu(item.name)}
                onHoverEnd={() => setActiveMenu(null)}
              >
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 xl:px-6 xl:py-3 rounded-xl font-medium transition-all duration-300 text-sm xl:text-base
                    ${location.pathname === item.path
                      ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <span className="text-cyan-400 w-4 h-4 xl:w-5 xl:h-5">{item.icon}</span>
                  <span className="hidden xl:inline">{item.name}</span>
                </Link>

                {/* Animated Active Indicator */}
                {location.pathname === item.path && (
                  <motion.div
                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full"
                    layoutId="activeIndicator"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
            ))}
          </nav>

          {/* Right Side - Industrial Control Panel */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            {/* Smart Fabrication Modules */}
            <motion.div className="relative">
              <PlasmaButton
                onClick={() => setActiveMenu(activeMenu === 'fabrication' ? null : 'fabrication')}
                className="text-xs xl:text-sm px-3 py-2 xl:px-4 xl:py-2.5"
              >
                <Sparkles className="w-3 h-3 xl:w-4 xl:h-4" />
                <span className="hidden xl:inline">Fabrication AI</span>
                <span className="xl:hidden">AI</span>
                <ChevronDown className={`w-3 h-3 xl:w-4 xl:h-4 transition-transform ${
                  activeMenu === 'fabrication' ? 'rotate-180' : ''
                }`} />
              </PlasmaButton>

              <AnimatePresence>
                {activeMenu === 'fabrication' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-80 xl:w-96 bg-gray-800/95 backdrop-blur-xl border border-cyan-500/20 rounded-xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-4">
                      <h3 className="text-cyan-400 font-bold mb-3 flex items-center gap-2">
                        <Cpu className="w-4 h-4" />
                        Smart Fabrication Suite
                      </h3>
                      <div className="space-y-2">
                        {fabricationModules.map((module) => (
                          <Link
                            key={module.name}
                            to={module.path}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-cyan-500/10 transition-all duration-200 group"
                          >
                            <div className="text-cyan-400 group-hover:scale-110 transition-transform">
                              {module.icon}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-white flex items-center gap-2">
                                {module.name}
                                {module.badge && (
                                  <span className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                                    {module.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-400">{module.description}</div>
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
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 xl:p-3 rounded-lg bg-gray-800/50 hover:bg-cyan-500/10 border border-gray-700 hover:border-cyan-500/30 transition-all duration-300"
              >
                <ShoppingCart className="w-4 h-4 xl:w-5 xl:h-5 text-gray-300" />
              </motion.button>

              <PlasmaButton 
                className="text-xs xl:text-sm px-3 py-2 xl:px-4 xl:py-2"
                onClick={() => window.location.href = '/customer-portal'}
              >
                <User className="w-3 h-3 xl:w-4 xl:h-4" />
                <span className="hidden xl:inline">Operator Portal</span>
                <span className="xl:hidden">Portal</span>
              </PlasmaButton>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-3 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-300"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-gray-900/95 backdrop-blur-xl border-t border-cyan-500/20"
          >
            <div className="container mx-auto px-4 py-6">
              <div className="space-y-4">
                {/* Back to Almona Forge - Mobile */}
                <Link
                  to="/"
                  className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white transition-all duration-300"
                  onClick={() => setMobileOpen(false)}
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span className="font-medium">Back to Almona Forge</span>
                </Link>
                
                {mainNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className="flex items-center gap-3 p-4 rounded-xl bg-gray-800/50 border border-gray-700 hover:border-cyan-500/30 transition-all duration-300"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="text-cyan-400">{item.icon}</span>
                    <span className="text-white font-medium">{item.name}</span>
                  </Link>
                ))}
                
                {/* Mobile Fabrication Modules */}
                <div className="pt-4 border-t border-gray-700">
                  <h4 className="text-cyan-400 font-bold mb-3">Fabrication AI</h4>
                  <div className="space-y-2">
                    {fabricationModules.map((module) => (
                      <Link
                        key={module.name}
                        to={module.path}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-cyan-500/10 transition-all duration-200"
                        onClick={() => setMobileOpen(false)}
                      >
                        {module.icon}
                        <div>
                          <div className="text-white text-sm">{module.name}</div>
                          <div className="text-gray-400 text-xs">{module.description}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Scanning Line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
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

export default IndustrialNavbar;