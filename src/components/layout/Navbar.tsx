import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, 
  X, 
  ChevronDown, 
  ShoppingCart, 
  User, 
  LogOut,
  Shield,
  Sparkles,
  Globe,
  Workflow,
  Factory
} from "lucide-react";

interface User {
  name: string;
  email: string;
  role: "user" | "admin";
}

interface NavbarProps {
  user?: User;
  quoteItems?: unknown[];
  onLogout?: () => void;
}

interface NavItem {
  name: string;
  path: string;
  type: "link" | "dropdown";
  items?: { name: string; path: string; description?: string; icon?: string; featured?: boolean }[];
  badge?: "NEW" | "AI" | "PRO";
}

const Navbar: React.FC<NavbarProps> = ({ user, quoteItems = [], onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const navbarRef = useRef<HTMLElement>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout>();

  // Navigation configuration
  const navItems = useMemo<NavItem[]>(() => [
    { 
      name: "Home", 
      path: "/", 
      type: "link" 
    },
    { 
      name: "Products", 
      path: "/products", 
      type: "dropdown",
      badge: "AI",
      items: [
        { 
          name: "YILMAZ Machines", 
          path: "/products/machines", 
          description: "Industrial machinery solutions" 
        },
        { 
          name: "3D Configurator", 
          path: "/products/configurator", 
          description: "Customize in real-time" 
        },
        { 
          name: "AR Viewer", 
          path: "/products/ar-viewer", 
          description: "See it in your space" 
        },
        { 
          name: "3D Gallery", 
          path: "/products/3d-gallery", 
          description: "Interactive 3D model collection" 
        },
      ]
    },
    { 
      name: "Services", 
      path: "/services", 
      type: "dropdown",
      badge: "PRO",
      items: [
        { 
          name: "All Services", 
          path: "/services", 
          description: "Complete AI-powered services overview" 
        },
        { 
          name: "AI Equipment Advisor", 
          path: "/services/ai-advisor", 
          description: "Smart recommendations" 
        },
        { 
          name: "Machine Sales", 
          path: "/services/sales", 
          description: "Best deals guaranteed" 
        },
        { 
          name: "Technical Training", 
          path: "/services/training", 
          description: "Expert-led sessions" 
        },
        { 
          name: "Fabrication Services", 
          path: "/fabrication-services", 
          description: "Precision engineering" 
        }
      ]
    },
    {
      name: "Fabricator Pro",
      path: "/fabricator",
      type: "link",
      badge: "PRO"
    },
    { 
      name: "Smart Shop", 
      path: "/shop", 
      type: "link", 
      badge: "NEW" 
    },
    { 
      name: "About", 
      path: "/about", 
      type: "link" 
    },
    { 
      name: "Contact", 
      path: "/contact", 
      type: "link" 
    },
  ], []);

  // Regions data
  const regions = useMemo(() => [
    { code: 'EG', name: 'Egypt', flag: '🇪🇬', currency: 'EGP' },
    { code: 'TR', name: 'Turkey', flag: '🇹🇷', currency: 'TRY' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR' },
    { code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼', currency: 'KWD' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦', currency: 'QAR' },
    { code: 'BH', name: 'Bahrain', flag: '🇧🇭', currency: 'BHD' },
    { code: 'OM', name: 'Oman', flag: '🇴🇲', currency: 'OMR' },
    { code: 'JO', name: 'Jordan', flag: '🇯🇴', currency: 'JOD' },
    { code: 'LB', name: 'Lebanon', flag: '🇱🇧', currency: 'LBP' },
    { code: 'IQ', name: 'Iraq', flag: '🇮🇶', currency: 'IQD' },
    { code: 'LY', name: 'Libya', flag: '🇱🇾', currency: 'LYD' },
    { code: 'MA', name: 'Morocco', flag: '🇲🇦', currency: 'MAD' },
    { code: 'TN', name: 'Tunisia', flag: '🇹🇳', currency: 'TND' },
    { code: 'DZ', name: 'Algeria', flag: '🇩🇿', currency: 'DZD' },
    { code: 'SD', name: 'Sudan', flag: '🇸🇩', currency: 'SDG' },
    { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', currency: 'ETB' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR' }
  ], []);

  // Dropdown handlers
  const handleDropdownEnter = useCallback((dropdownName: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setActiveDropdown(dropdownName);
  }, []);

  const handleDropdownLeave = useCallback(() => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  }, []);

  const closeAllDropdowns = useCallback(() => {
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
  }, []);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    closeAllDropdowns();
  }, [location.pathname, closeAllDropdowns]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
        closeAllDropdowns();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeAllDropdowns]);

  // Active path detection
  const isActivePath = useCallback((path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // Badge styling
  const getBadgeStyles = useCallback((badge: NavItem["badge"]) => {
    const baseStyles = "text-xs px-1.5 py-0.5 rounded-full text-white font-bold";
    
    switch (badge) {
      case "AI":
        return `${baseStyles} bg-gradient-to-r from-cyan-500 to-blue-500`;
      case "PRO":
        return `${baseStyles} bg-gradient-to-r from-purple-500 to-pink-500`;
      case "NEW":
        return `${baseStyles} bg-gradient-to-r from-green-500 to-emerald-500`;
      default:
        return baseStyles;
    }
  }, []);

  // Logo Component
  const Logo: React.FC = () => (
    <svg 
      className="w-12 h-12 transition-transform duration-500 group-hover:rotate-180" 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer glow effect */}
      <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" opacity="0.15" />
      
      {/* Main disc body with metallic sheen */}
      <circle cx="50" cy="50" r="42" fill="url(#logoGradient)" />
      <circle cx="50" cy="50" r="42" fill="url(#metallicSheen)" opacity="0.3" />
      
      {/* Triple Chip Grind (TCG) Teeth - 24 teeth for aluminum cutting */}
      {[...Array(24)].map((_, i) => {
        const angle = (i * 15 - 5) * Math.PI / 180;
        const isFlat = i % 2 === 0;
        
        if (isFlat) {
          const x1 = 50 + 40 * Math.cos(angle);
          const y1 = 50 + 40 * Math.sin(angle);
          const x2 = 50 + 47 * Math.cos(angle);
          const y2 = 50 + 47 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#E8E8E8"
              strokeWidth="2.5"
              strokeLinecap="square"
            />
          );
        } else {
          const x1 = 50 + 40 * Math.cos(angle);
          const y1 = 50 + 40 * Math.sin(angle);
          const x2 = 50 + 48 * Math.cos(angle);
          const y2 = 50 + 48 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        }
      })}
      
      {/* Carbide tip indicators */}
      {[...Array(24)].map((_, i) => {
        const angle = (i * 15 - 5) * Math.PI / 180;
        const x = 50 + 44 * Math.cos(angle);
        const y = 50 + 44 * Math.sin(angle);
        return (
          <circle
            key={`tip-${i}`}
            cx={x}
            cy={y}
            r="0.8"
            fill="#FFC107"
            opacity="0.8"
          />
        );
      })}
      
      {/* Expansion slots */}
      {[...Array(4)].map((_, i) => {
        const angle = (i * 90 + 45) * Math.PI / 180;
        const x1 = 50 + 28 * Math.cos(angle);
        const y1 = 50 + 28 * Math.sin(angle);
        const x2 = 50 + 38 * Math.cos(angle);
        const y2 = 50 + 38 * Math.sin(angle);
        return (
          <line
            key={`slot-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />
        );
      })}
      
      {/* Inner reinforcement rings */}
      <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <circle cx="50" cy="50" r="16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      
      {/* Center mounting hole */}
      <circle cx="50" cy="50" r="10" fill="#0d0f12" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <circle cx="50" cy="50" r="6" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      
      {/* Brand marking area */}
      <circle cx="50" cy="50" r="26" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2,2" />
      
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF5F1F" />
          <stop offset="50%" stopColor="#FF8C00" />
          <stop offset="100%" stopColor="#E14A00" />
        </linearGradient>
        <radialGradient id="metallicSheen" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );

  // Navigation Item Component
  const NavItemComponent: React.FC<{ item: NavItem }> = ({ item }) => {
    const isDropdownActive =
      item.type === "dropdown" &&
      (isActivePath(item.path) ||
        item.items?.some((sub) => isActivePath(sub.path)));

    const isItemActive = item.type === "link"
      ? isActivePath(item.path)
      : isDropdownActive || activeDropdown === item.name;

    return (
      <div
        className="relative"
        onMouseEnter={() => item.type === "dropdown" && handleDropdownEnter(item.name)}
        onMouseLeave={handleDropdownLeave}
      >
        {item.type === "link" ? (
        <Link
          to={item.path}
          className={`relative inline-flex items-center px-4 py-3 rounded-xl transition-all duration-300 font-semibold group overflow-hidden ${
            isItemActive
              ? "text-orange-400 shadow-xl shadow-orange-500/20 border border-orange-500/30 scale-105"
              : "text-gray-300 hover:text-white hover:shadow-xl hover:shadow-orange-500/15 hover:border hover:border-orange-500/25 hover:scale-105"
          }`}
          onClick={closeAllDropdowns}
        >
          {/* Background glow effect */}
          <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${
            isActivePath(item.path)
              ? "bg-gradient-to-r from-orange-500/15 to-red-500/15 animate-pulse"
              : "bg-gradient-to-r from-orange-500/0 to-red-500/0 group-hover:from-orange-500/5 group-hover:to-red-500/5"
          }`} />
          
          {/* Content */}
          <span className="relative flex items-center space-x-2 z-10">
            <span className="transition-all duration-300 group-hover:text-orange-200">{item.name}</span>
            {item.badge && (
              <span className={`${getBadgeStyles(item.badge)} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-orange-500/25`}>
                {item.badge}
              </span>
            )}
          </span>
          
          {/* Animated underline */}
          <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300 ${
            isItemActive 
              ? "w-3/4 shadow-lg shadow-orange-500/50" 
              : "w-0 group-hover:w-3/4 group-hover:shadow-lg group-hover:shadow-orange-500/50"
          }`} />
          
          {/* Top highlight for active items */}
          {isItemActive && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-orange-400 to-red-400 rounded-full shadow-lg shadow-orange-500/50" />
          )}
        </Link>
      ) : (
        <>
          <button
            className={`relative px-4 py-3 rounded-xl transition-all duration-300 font-semibold flex items-center space-x-2 group ${
              isItemActive
                ? "text-orange-400 bg-gradient-to-r from-orange-500/10 to-red-500/10 shadow-lg shadow-orange-500/10"
                : "text-gray-300 hover:text-white hover:bg-white/5 hover:shadow-lg"
            }`}
          >
            <span className="flex items-center space-x-2">
              <span>{item.name}</span>
              {item.badge && (
                <span className={getBadgeStyles(item.badge)}>
                  {item.badge}
                </span>
              )}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${
              activeDropdown === item.name ? "rotate-180 text-orange-400" : "text-gray-400"
            }`} />
            <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300 group-hover:w-3/4 ${
              isItemActive ? "w-3/4" : ""
            }`} />
          </button>

          <AnimatePresence>
            {activeDropdown === item.name && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 mt-3 w-80 bg-gray-900/95 backdrop-blur-xl border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden z-[210]"
              >
                <div className="p-3 space-y-1">
                  {item.items?.map((subItem) => {
                    const IconComponent = subItem.icon === "Workflow" ? Workflow : 
                                         subItem.icon === "Factory" ? Factory : null;
                    const isFeatured = subItem.featured;
                    
                    return (
                      <Link
                        key={subItem.name}
                        to={subItem.path}
                        className={`block p-3 rounded-xl transition-all duration-300 group ${
                          isFeatured 
                            ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 hover:from-orange-500/30 hover:to-red-500/30 hover:border-orange-500/50" 
                            : "text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-red-500/10"
                        }`}
                        onClick={closeAllDropdowns}
                      >
                        <div className="flex items-start space-x-3">
                          {IconComponent && (
                            <IconComponent className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                              isFeatured ? "text-orange-400" : "text-gray-400 group-hover:text-orange-400"
                            } transition-colors`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium transition-colors ${
                              isFeatured 
                                ? "text-white group-hover:text-orange-300" 
                                : "text-white group-hover:text-orange-300"
                            }`}>
                              {subItem.name}
                              {isFeatured && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold">
                                  PRO
                                </span>
                              )}
                            </div>
                            {subItem.description && (
                              <div className={`text-sm mt-1 ${
                                isFeatured 
                                  ? "text-gray-300 group-hover:text-gray-200" 
                                  : "text-gray-400 group-hover:text-gray-300"
                              }`}>
                                {subItem.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
  };

  return (
    <nav 
      ref={navbarRef}
      className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-300 backdrop-blur-xl ${
        isScrolled 
          ? "bg-black/95 border-b border-orange-500/30 shadow-2xl" 
          : "bg-gradient-to-b from-black/95 to-black/80"
      }`}
    >
      <div className="mx-auto px-4 xl:px-8 max-w-screen-2xl">
        <div className="flex items-center justify-between h-16 lg:h-24">
          
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 text-white font-bold text-xl group"
            onClick={closeAllDropdowns}
          >
            <div className="relative">
              <Logo />
            </div>
            <span className="bg-gradient-to-r from-orange-200 to-red-200 bg-clip-text text-transparent text-2xl font-extrabold">
              ALMONA
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            {navItems.map((item) => (
              <NavItemComponent key={item.name} item={item} />
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center gap-3 xl:gap-4">
            {/* Region Selector */}
            <div 
              className="relative"
              onMouseEnter={() => handleDropdownEnter('region')}
              onMouseLeave={handleDropdownLeave}
            >
              <button
                className="flex items-center space-x-2 p-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-orange-500/20 group"
                onClick={closeAllDropdowns}
              >
                <Globe className="h-5 w-5 group-hover:text-orange-400 transition-colors" />
                <span className="hidden lg:block text-sm font-medium">Region</span>
                <ChevronDown className="h-4 w-4 group-hover:text-orange-400 transition-colors" />
              </button>

              <AnimatePresence>
                {activeDropdown === 'region' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-2 w-80 bg-almona-dark border border-almona-light/20 rounded-xl shadow-2xl z-[210] overflow-hidden"
                  >
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-white mb-3">Select Your Region</h3>
                      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                        {regions.map((region) => (
                          <button
                            key={region.code}
                            className="flex items-center justify-between p-3 text-left hover:bg-white/5 rounded-lg transition-colors group"
                            onClick={() => {
                              console.log('Selected region:', region);
                              setActiveDropdown(null);
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{region.flag}</span>
                              <div>
                                <div className="text-white font-medium">{region.name}</div>
                                <div className="text-gray-400 text-sm">{region.currency}</div>
                              </div>
                            </div>
                            <div className="text-gray-400 group-hover:text-orange-400 transition-colors">
                              <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quote Cart */}
            <Link
              to="/quote"
              className="relative p-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-orange-500/20 group"
              onClick={closeAllDropdowns}
            >
              <ShoppingCart className="h-5 w-5 group-hover:scale-110 transition-transform" />
              {quoteItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg">
                  {Math.min(quoteItems.length, 99)}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  className="flex items-center space-x-2 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 border border-transparent hover:border-orange-500/20"
                  onClick={() => setActiveDropdown(activeDropdown === "user" ? null : "user")}
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium max-w-24 truncate">{user.name}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                <AnimatePresence>
                  {activeDropdown === "user" && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-3 w-64 bg-gray-900/95 backdrop-blur-xl border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden z-[210]"
                    >
                      <div className="p-3 border-b border-orange-500/20">
                        <div className="font-medium text-white">{user.name}</div>
                        <div className="text-sm text-gray-400 truncate">{user.email}</div>
                      </div>
                      <div className="p-2 space-y-1">
                        {user.role === "admin" && (
                          <Link
                            to="/admin"
                            className="flex items-center space-x-3 px-3 py-3 text-sm text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-red-500/10 rounded-xl transition-all duration-300 group"
                            onClick={closeAllDropdowns}
                          >
                            <Shield className="h-4 w-4 group-hover:text-orange-400" />
                            <span>Admin Panel</span>
                          </Link>
                        )}
                        <Link
                          to="/portal"
                          className="flex items-center space-x-3 px-3 py-3 text-sm text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-red-500/10 rounded-xl transition-all duration-300 group"
                          onClick={closeAllDropdowns}
                        >
                          <User className="h-4 w-4 group-hover:text-orange-400" />
                          <span>My Portal</span>
                        </Link>
                        <button
                          onClick={() => {
                            onLogout?.();
                            closeAllDropdowns();
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-3 text-sm text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-red-500/10 rounded-xl transition-all duration-300 group"
                        >
                          <LogOut className="h-4 w-4 group-hover:text-red-400" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-6 py-2.5 text-gray-300 hover:text-white transition-all duration-300 font-medium hover:scale-105"
                  onClick={closeAllDropdowns}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 font-medium shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105"
                  onClick={closeAllDropdowns}
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-3 text-gray-300 hover:text-white transition-all duration-300 hover:bg-white/5 rounded-xl"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-orange-500/30 bg-black/95 backdrop-blur-xl relative z-[210]"
            >
              <div className="py-4 space-y-1">
                {/* Mobile Navigation Items */}
                {navItems.map((item) => (
                  <div key={item.name} className="px-1">
                    {item.type === "link" ? (
                      <Link
                        to={item.path}
                        className={`relative flex items-center justify-between px-4 py-4 text-lg font-semibold transition-all duration-300 rounded-xl mx-1 overflow-hidden ${
                          isActivePath(item.path)
                            ? "text-orange-400 border border-orange-500/30 shadow-xl shadow-orange-500/20 scale-105"
                            : "text-gray-300 hover:text-white hover:shadow-xl hover:shadow-orange-500/15 hover:border hover:border-orange-500/25 hover:scale-105"
                        }`}
                        onClick={closeAllDropdowns}
                      >
                        {/* Background glow effect */}
                        <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                          isActivePath(item.path)
                            ? "bg-gradient-to-r from-orange-500/15 to-red-500/15 animate-pulse"
                            : "bg-gradient-to-r from-orange-500/0 to-red-500/0 hover:from-orange-500/5 hover:to-red-500/5"
                        }`} />
                        
                        {/* Content */}
                        <span className="relative flex items-center space-x-3 z-10">
                          <span className="transition-all duration-300 hover:text-orange-200">{item.name}</span>
                          {item.badge && (
                            <span className={`${getBadgeStyles(item.badge)} transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-orange-500/25`}>
                              {item.badge}
                            </span>
                          )}
                        </span>
                        
                        {/* Animated underline */}
                        <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300 ${
                          isActivePath(item.path) 
                            ? "w-3/4 shadow-lg shadow-orange-500/50" 
                            : "w-0 hover:w-3/4 hover:shadow-lg hover:shadow-orange-500/50"
                        }`} />
                        
                        {/* Top highlight for active items */}
                        {isActivePath(item.path) && (
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-orange-400 to-red-400 rounded-full shadow-lg shadow-orange-500/50" />
                        )}
                      </Link>
                    ) : (
                      <div>
                        <button
                          className={`w-full flex items-center justify-between px-4 py-4 text-lg font-semibold transition-all duration-300 rounded-xl mx-1 ${
                            isActivePath(item.path) || activeDropdown === item.name
                              ? "text-orange-400 bg-gradient-to-r from-orange-500/10 to-red-500/10"
                              : "text-gray-300 hover:text-white hover:bg-white/5"
                          }`}
                          onClick={() => setActiveDropdown(activeDropdown === item.name ? null : item.name)}
                        >
                          <span className="flex items-center space-x-3">
                            <span>{item.name}</span>
                            {item.badge && (
                              <span className={getBadgeStyles(item.badge)}>
                                {item.badge}
                              </span>
                            )}
                          </span>
                          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${
                            activeDropdown === item.name ? "rotate-180" : ""
                          }`} />
                        </button>

                        <AnimatePresence>
                          {activeDropdown === item.name && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="ml-6 mt-1 space-y-1 overflow-hidden"
                            >
                              {item.items?.map((subItem) => {
                                const IconComponent = subItem.icon === "Workflow" ? Workflow : 
                                                     subItem.icon === "Factory" ? Factory : null;
                                const isFeatured = subItem.featured;
                                
                                return (
                                  <Link
                                    key={subItem.name}
                                    to={subItem.path}
                                    className={`block px-4 py-3 rounded-xl transition-all duration-300 ${
                                      isFeatured 
                                        ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 hover:from-orange-500/30 hover:to-red-500/30" 
                                        : "text-gray-300 hover:text-white hover:bg-orange-500/10"
                                    }`}
                                    onClick={closeAllDropdowns}
                                  >
                                    <div className="flex items-start space-x-3">
                                      {IconComponent && (
                                        <IconComponent className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                                          isFeatured ? "text-orange-400" : "text-gray-400"
                                        }`} />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className={`font-medium ${
                                          isFeatured ? "text-white" : ""
                                        }`}>
                                          {subItem.name}
                                          {isFeatured && (
                                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold">
                                              PRO
                                            </span>
                                          )}
                                        </div>
                                        {subItem.description && (
                                          <div className={`text-sm mt-1 ${
                                            isFeatured ? "text-gray-300" : "text-gray-400"
                                          }`}>
                                            {subItem.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </Link>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                ))}

                {/* Mobile User Actions */}
                <div className="pt-4 border-t border-orange-500/30 mt-4">
                  {user ? (
                    <div className="space-y-2 px-2">
                      <div className="px-4 py-3 text-gray-300 border border-orange-500/20 rounded-xl">
                        <div className="font-semibold">Welcome, {user.name}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                      {user.role === "admin" && (
                        <Link
                          to="/admin"
                          className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300"
                          onClick={closeAllDropdowns}
                        >
                          <Shield className="h-5 w-5" />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      <Link
                        to="/portal"
                        className="flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300"
                        onClick={closeAllDropdowns}
                      >
                        <User className="h-5 w-5" />
                        <span>My Portal</span>
                      </Link>
                      <button
                        onClick={() => {
                          onLogout?.();
                          closeAllDropdowns();
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 text-left"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 px-2">
                      <Link
                        to="/login"
                        className="block px-4 py-4 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 text-center font-semibold"
                        onClick={closeAllDropdowns}
                      >
                        Login
                      </Link>
                      <Link
                        to="/register"
                        className="block px-4 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 text-center font-semibold shadow-lg"
                        onClick={closeAllDropdowns}
                      >
                        Register
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default Navbar;