import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Menu, 
  X, 
  ChevronDown, 
  User, 
  LogOut,
  Shield,
  Workflow,
  Factory,
  Settings
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface NavbarUser {
  name: string;
  email: string;
  role: "user" | "admin";
}

interface NavbarProps {
  user?: NavbarUser;
  quoteItems?: unknown[];
  onLogout?: () => void;
}

interface NavItem {
  name: string;
  path: string;
  type: "link" | "dropdown";
  items?: { name: string; path: string; description?: string; icon?: string; featured?: boolean }[];
  badge?: "NEW" | "AI" | "PRO" | "BETA" | "SOON";
}

const Navbar: React.FC<NavbarProps> = ({ user: propUser, quoteItems: _quoteItems = [], onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  
  const location = useLocation();
  const navbarRef = useRef<HTMLElement>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout>();
  const { user: authUser, signOut } = useAuth();

  // Prefer explicit Navbar prop, else fall back to authenticated user from AuthContext
  const user: NavbarUser | undefined = useMemo(() => {
    if (propUser) return propUser;
    if (!authUser) return undefined;

    const displayName =
      authUser.full_name ||
      authUser.company_name ||
      authUser.email ||
      "User";

    const displayEmail = authUser.email || authUser.username || "";
    const role: NavbarUser["role"] = authUser.role === "admin" ? "admin" : "user";

    return {
      name: displayName,
      email: displayEmail,
      role,
    };
  }, [propUser, authUser]);

  // Responsive breakpoint detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Navigation configuration
  const navItems = useMemo<NavItem[]>(() => [
    { name: "Home", path: "/", type: "link" },
    { 
      name: "Products", 
      path: "/products", 
      type: "dropdown",
      items: [
        { name: "YILMAZ Machines", path: "/products/machines", description: "Industrial machinery solutions" },
        { name: "3D Configurator", path: "/products/configurator", description: "Customize in real-time" },
        { name: "AR Viewer", path: "/products/3d-gallery#swiftxr", description: "See it in your space" },
        { name: "3D Gallery", path: "/products/3d-gallery", description: "Interactive 3D model collection" },
      ]
    },
    { 
      name: "Services", 
      path: "/services", 
      type: "dropdown",
      badge: "PRO",
      items: [
        { name: "All Services", path: "/services", description: "Complete AI-powered services overview" },
        { name: "AI Equipment Advisor", path: "/services/ai-advisor", description: "Smart recommendations" },
        { name: "Machine Sales", path: "/services/sales", description: "Best deals guaranteed" },
        { name: "Technical Training", path: "/services/training", description: "Expert-led sessions" },
        { name: "Fabrication Services", path: "/fabrication-services", description: "Precision engineering" }
      ]
    },
    { name: "Fabricator Pro", path: "/fabricator", type: "link", badge: "BETA" },
    { name: "Smart Shop", path: "/shop", type: "link", badge: "SOON" },
    { name: "About", path: "/about", type: "link" },
    { name: "Contact", path: "/contact", type: "link" },
  ], []);

  // Simple dropdown handlers
  const handleDropdownToggle = useCallback((name: string) => {
    setActiveDropdown(prev => prev === name ? null : name);
  }, []);

  const handleDropdownEnter = useCallback((name: string) => {
    if (!isMobile) {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
      setActiveDropdown(name);
    }
  }, [isMobile]);

  const handleDropdownLeave = useCallback((_name: string) => {
    if (!isMobile) {
      dropdownTimeoutRef.current = setTimeout(() => {
        setActiveDropdown(null);
      }, 200);
    }
  }, [isMobile]);

  const closeAllDropdowns = useCallback(() => {
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
    setConfirmLogout(false);
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
  }, []);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close on route change
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

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Active path detection
  const isActivePath = useCallback((path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // Badge styling – harmonized colors and tighter font
  const getBadgeStyles = useCallback((badge: NavItem["badge"]) => {
    const baseStyles = "text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-tight shadow-sm";
    switch (badge) {
      case "AI":
        return `${baseStyles} text-white bg-gradient-to-r from-cyan-500 to-blue-500`;
      case "PRO":
        return `${baseStyles} text-white bg-gradient-to-r from-purple-500 to-pink-500`;
      case "BETA":
        return `${baseStyles} text-white bg-gradient-to-r from-purple-500 to-pink-500`;
      case "SOON":
        return `${baseStyles} text-white bg-gradient-to-r from-amber-500 to-orange-500`;
      case "NEW":
        return `${baseStyles} text-white bg-gradient-to-r from-green-500 to-emerald-500`;
      default:
        return `${baseStyles} text-white bg-slate-700`;
    }
  }, []);

  // Logo Component
  const Logo: React.FC = () => (
    <svg 
      className="w-full h-full transition-transform duration-500 group-hover:rotate-180" 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" opacity="0.15" />
      <circle cx="50" cy="50" r="42" fill="url(#logoGradient)" />
      <circle cx="50" cy="50" r="42" fill="url(#metallicSheen)" opacity="0.3" />
      {[...Array(24)].map((_, i) => {
        const angle = (i * 15 - 5) * Math.PI / 180;
        const isFlat = i % 2 === 0;
        if (isFlat) {
          const x1 = 50 + 40 * Math.cos(angle);
          const y1 = 50 + 40 * Math.sin(angle);
          const x2 = 50 + 47 * Math.cos(angle);
          const y2 = 50 + 47 * Math.sin(angle);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E8E8E8" strokeWidth="2.5" strokeLinecap="square" />;
        } else {
          const x1 = 50 + 40 * Math.cos(angle);
          const y1 = 50 + 40 * Math.sin(angle);
          const x2 = 50 + 48 * Math.cos(angle);
          const y2 = 50 + 48 * Math.sin(angle);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth="2" strokeLinecap="round" />;
        }
      })}
      {[...Array(24)].map((_, i) => {
        const angle = (i * 15 - 5) * Math.PI / 180;
        const x = 50 + 44 * Math.cos(angle);
        const y = 50 + 44 * Math.sin(angle);
        return <circle key={`tip-${i}`} cx={x} cy={y} r="0.8" fill="#FFC107" opacity="0.8" />;
      })}
      {[...Array(4)].map((_, i) => {
        const angle = (i * 90 + 45) * Math.PI / 180;
        const x1 = 50 + 28 * Math.cos(angle);
        const y1 = 50 + 28 * Math.sin(angle);
        const x2 = 50 + 38 * Math.cos(angle);
        const y2 = 50 + 38 * Math.sin(angle);
        return <line key={`slot-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />;
      })}
      <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <circle cx="50" cy="50" r="16" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="10" fill="#0d0f12" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <circle cx="50" cy="50" r="6" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <circle cx="50" cy="50" r="26" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2,2" />
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

  return (
    <nav 
      ref={navbarRef}
      dir="ltr"
      className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-200 ${
        isScrolled 
          ? "bg-black/95 border-b border-orange-500/30 shadow-2xl" 
          : "bg-gradient-to-b from-black/95 to-black/80"
      }`}
    >
      <div className="mx-auto px-3 sm:px-4 md:px-6 lg:px-6 xl:px-8 2xl:px-10 max-w-screen-2xl">
        <div className="flex items-center justify-start gap-3 lg:gap-4 xl:gap-5 2xl:gap-6 h-14 sm:h-16 md:h-18 lg:h-20 xl:h-20 2xl:h-24">
          
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 sm:space-x-2.5 md:space-x-3 text-white font-bold text-xl group flex-shrink-0"
            onClick={closeAllDropdowns}
          >
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-12 xl:h-12 2xl:w-14 2xl:h-14">
              <Logo />
            </div>
            <span className="bg-gradient-to-r from-orange-200 to-red-200 bg-clip-text text-transparent text-base sm:text-lg md:text-xl lg:text-xl xl:text-xl 2xl:text-3xl font-extrabold whitespace-nowrap">
              ALMONA
            </span>
          </Link>

          {/* Desktop Navigation - Left aligned */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3 2xl:gap-4 flex-shrink-0">
            {navItems.map((item) => {
              const isActive = isActivePath(item.path);
              
              if (item.type === "link") {
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`px-3 py-2 xl:px-4 xl:py-2.5 2xl:px-4 2xl:py-3 rounded-xl transition-all duration-200 font-semibold text-sm xl:text-sm 2xl:text-base whitespace-nowrap ${
                      isActive
                        ? "text-orange-400 bg-gradient-to-r from-orange-500/10 to-red-500/10"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={closeAllDropdowns}
                    aria-label={`Navigate to ${item.name} page`}
                  >
                    <span className="flex items-center gap-2">
                      {item.name}
                      {item.badge && <span className={getBadgeStyles(item.badge)}>{item.badge}</span>}
                    </span>
                  </Link>
                );
              }

              return (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => handleDropdownEnter(item.name)}
                  onMouseLeave={() => handleDropdownLeave(item.name)}
                >
                  <button
                    onClick={() => handleDropdownToggle(item.name)}
                    className={`px-3 py-2 xl:px-4 xl:py-2.5 2xl:px-4 2xl:py-3 rounded-xl transition-all duration-200 font-semibold text-sm xl:text-sm 2xl:text-base flex items-center gap-2 whitespace-nowrap ${
                      isActive || activeDropdown === item.name
                        ? "text-orange-400 bg-gradient-to-r from-orange-500/10 to-red-500/10"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                    aria-haspopup="true"
                    aria-expanded={activeDropdown === item.name}
                    aria-label={`Open ${item.name} dropdown menu`}
                  >
                    <span>{item.name}</span>
                    {item.badge && <span className={getBadgeStyles(item.badge)}>{item.badge}</span>}
                    <ChevronDown className={`h-4 w-4 transition-transform ${activeDropdown === item.name ? 'rotate-180' : ''}`} />
                  </button>

                  {activeDropdown === item.name && (
                      <div
                        className="absolute top-full left-0 mt-2 w-72 xl:w-80 2xl:w-96 bg-gray-900/95 backdrop-blur-xl border border-orange-500/30 rounded-xl shadow-2xl overflow-hidden navbar-dropdown-enter"
                        style={{ zIndex: 10000 }}
                        onMouseEnter={() => handleDropdownEnter(item.name)}
                        onMouseLeave={() => handleDropdownLeave(item.name)}
                      >
                        <div className="p-3 space-y-1 max-h-[80vh] overflow-y-auto">
                          {item.items?.map((subItem) => {
                            const IconComponent = subItem.icon === "Workflow" ? Workflow : subItem.icon === "Factory" ? Factory : null;
                            return (
                              <Link
                                key={subItem.name}
                                to={subItem.path}
                                className="block p-3 rounded-xl transition-all duration-200 text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-red-500/10"
                                onClick={closeAllDropdowns}
                                aria-label={`Navigate to ${subItem.name} page`}
                              >
                                <div className="flex items-start gap-3">
                                  {IconComponent && <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0 text-gray-400" />}
                                  <div className="flex-1">
                                    <div className="font-medium text-white">{subItem.name}</div>
                                    {subItem.description && (
                                      <div className="text-sm text-gray-400 mt-1">{subItem.description}</div>
                                    )}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center gap-1.5 xl:gap-2 2xl:gap-3 flex-shrink-0 ml-auto">
            {/* User Menu */}
            {user ? (
              <div className="relative z-50">
                <button
                  onClick={() => handleDropdownToggle("user")}
                  className="flex items-center gap-1.5 xl:gap-2 px-2 py-1.5 xl:px-2.5 xl:py-2 2xl:px-3 2xl:py-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 min-w-[44px] min-h-[44px] flex-shrink-0"
                  aria-haspopup="true"
                  aria-expanded={activeDropdown === "user"}
                  aria-label="Open user dropdown menu"
                >
                  <div className="w-6 h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white text-xs xl:text-xs 2xl:text-sm font-bold flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Hide email/name text on right side; keep avatar only */}
                  <ChevronDown className={`h-3 w-3 xl:h-3 xl:w-3 2xl:h-3.5 2xl:w-3.5 transition-transform flex-shrink-0 ${activeDropdown === "user" ? "rotate-180" : ""}`} />
                </button>

                {activeDropdown === "user" && (
                    <div
                      className="absolute right-0 top-full mt-2 w-56 xl:w-64 2xl:w-72 bg-gray-900/95 backdrop-blur-xl border border-orange-500/30 rounded-xl shadow-2xl overflow-hidden navbar-dropdown-enter"
                      style={{ zIndex: 10000 }}
                    >
                      <div className="p-3 border-b border-orange-500/20">
                        <div className="font-medium text-white">{user.name || 'User'}</div>
                        <div className="text-sm text-gray-400 truncate">
                          {user.role === 'admin' ? 'Administrator' : user.role === 'user' ? 'User' : user.role || 'User'}
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        {user.role === "admin" && (
                          <Link
                            to="/admin"
                            className="flex items-center gap-3 px-3 py-3 text-sm text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-red-500/10 rounded-xl transition-all duration-200"
                            onClick={closeAllDropdowns}
                            aria-label="Navigate to admin panel"
                          >
                            <Shield className="h-4 w-4" />
                            <span>Admin Panel</span>
                          </Link>
                        )}
                        <Link
                          to="/portal"
                          className="flex items-center gap-3 px-3 py-3 text-sm text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-red-500/10 rounded-xl transition-all duration-200"
                          onClick={closeAllDropdowns}
                          aria-label="Navigate to machine control"
                        >
                          <Factory className="h-4 w-4" />
                          <span>Machine Control</span>
                        </Link>

                        {/* Removed Settings & Prices and Branding & Settings from dropdown */}
                        {!confirmLogout ? (
                          <button
                            onClick={() => setConfirmLogout(true)}
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-red-500/10 rounded-xl transition-all duration-200 text-left"
                            aria-label="Logout"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>Logout</span>
                          </button>
                        ) : (
                          <div className="w-full px-3 py-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 space-y-2">
                            <div className="text-sm text-white font-semibold">Confirm logout?</div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  onLogout?.();
                                  closeAllDropdowns();
                                }}
                                className="flex-1 px-3 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition-colors"
                              >
                                Yes, logout
                              </button>
                              <button
                                onClick={() => setConfirmLogout(false)}
                                className="flex-1 px-3 py-2 text-sm font-semibold text-gray-200 rounded-lg border border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 xl:gap-2 flex-shrink-0">
                <Link
                  to="/login"
                  className="px-2.5 py-1.5 xl:px-3 xl:py-2 2xl:px-3.5 2xl:py-2 text-xs xl:text-xs 2xl:text-sm text-gray-300 hover:text-white transition-all duration-200 font-medium whitespace-nowrap"
                  onClick={closeAllDropdowns}
                  aria-label="Navigate to login page"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-2.5 py-1.5 xl:px-3 xl:py-2 2xl:px-3.5 2xl:py-2 text-xs xl:text-xs 2xl:text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 font-medium shadow-lg whitespace-nowrap"
                  onClick={closeAllDropdowns}
                  aria-label="Navigate to register page"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 sm:p-3 text-gray-300 hover:text-white transition-all duration-200 hover:bg-white/5 rounded-xl flex-shrink-0 ml-auto"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6 sm:h-7 sm:w-7" /> : <Menu className="h-6 w-6 sm:h-7 sm:w-7" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
            <div
              className="lg:hidden border-t border-orange-500/30 bg-black/98 backdrop-blur-xl max-h-[calc(100vh-4rem)] overflow-y-auto mobile-menu-enter"
            >
              <div className="py-4 space-y-1 px-2">
                {navItems.map((item) => (
                  <div key={item.name} className="px-1">
                    {item.type === "link" ? (
                      <Link
                        to={item.path}
                        className={`block px-4 py-3 sm:py-4 text-base sm:text-lg font-semibold transition-all duration-200 rounded-xl ${
                          isActivePath(item.path)
                            ? "text-orange-400 bg-gradient-to-r from-orange-500/10 to-red-500/10"
                            : "text-gray-300 hover:text-white hover:bg-white/5"
                        }`}
                        onClick={closeAllDropdowns}
                        aria-label={`Navigate to ${item.name} page`}
                      >
                        <span className="flex items-center gap-3">
                          {item.name}
                          {item.badge && <span className={getBadgeStyles(item.badge)}>{item.badge}</span>}
                        </span>
                      </Link>
                    ) : (
                      <div>
                        <button
                          className={`w-full flex items-center justify-between px-4 py-3 sm:py-4 text-base sm:text-lg font-semibold transition-all duration-200 rounded-xl ${
                            isActivePath(item.path) || activeDropdown === item.name
                              ? "text-orange-400 bg-gradient-to-r from-orange-500/10 to-red-500/10"
                              : "text-gray-300 hover:text-white hover:bg-white/5"
                          }`}
                          onClick={() => handleDropdownToggle(item.name)}
                          aria-haspopup="true"
                          aria-expanded={activeDropdown === item.name}
                          aria-label={`Open ${item.name} dropdown menu`}
                        >
                          <span className="flex items-center gap-3">
                            {item.name}
                            {item.badge && <span className={getBadgeStyles(item.badge)}>{item.badge}</span>}
                          </span>
                          <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform ${activeDropdown === item.name ? "rotate-180" : ""}`} />
                        </button>

                        {activeDropdown === item.name && (
                            <div
                              className="ml-4 sm:ml-6 mt-1 space-y-1 overflow-hidden mobile-menu-enter"
                            >
                              {item.items?.map((subItem) => (
                                <Link
                                  key={subItem.name}
                                  to={subItem.path}
                                  className="block px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 text-gray-300 hover:text-white hover:bg-orange-500/10"
                                  onClick={closeAllDropdowns}
                                  aria-label={`Navigate to ${subItem.name} page`}
                                >
                                  <div className="font-medium text-sm sm:text-base text-white">{subItem.name}</div>
                                  {subItem.description && (
                                    <div className="text-xs sm:text-sm text-gray-400 mt-1">{subItem.description}</div>
                                  )}
                                </Link>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Mobile User Actions */}
                <div className="pt-4 border-t border-orange-500/30 mt-4">
                  {user ? (
                    <div className="space-y-2 px-2">
                      <div className="px-4 py-3 text-gray-300 border border-orange-500/20 rounded-xl">
                        <div className="font-semibold text-sm sm:text-base">Welcome, {user.name}</div>
                        <div className="text-xs sm:text-sm text-gray-400 truncate">{user.email}</div>
                      </div>
                      {user.role === "admin" && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
                          onClick={closeAllDropdowns}
                          aria-label="Navigate to admin panel"
                        >
                          <Shield className="h-5 w-5" />
                          <span className="text-sm sm:text-base">Admin Panel</span>
                        </Link>
                      )}
                      <Link
                        to="/portal"
                        className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
                        onClick={closeAllDropdowns}
                        aria-label="Navigate to my portal"
                      >
                        <User className="h-5 w-5" />
                        <span className="text-sm sm:text-base">My Portal</span>
                      </Link>
                      <button
                        onClick={async () => {
                          try {
                            if (onLogout) {
                              onLogout();
                            } else {
                              await signOut();
                            }
                          } finally {
                            closeAllDropdowns();
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 text-left"
                        aria-label="Logout"
                      >
                        <LogOut className="h-5 w-5" />
                        <span className="text-sm sm:text-base">Logout</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 px-2">
                      <Link
                        to="/login"
                        className="block px-4 py-3 sm:py-4 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 text-center font-semibold text-sm sm:text-base"
                        onClick={closeAllDropdowns}
                        aria-label="Navigate to login page"
                      >
                        Login
                      </Link>
                      <Link
                        to="/register"
                        className="block px-4 py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 text-center font-semibold shadow-lg text-sm sm:text-base"
                        onClick={closeAllDropdowns}
                        aria-label="Navigate to register page"
                      >
                        Register
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
      </div>
    </nav>
  );
};

export default Navbar;
