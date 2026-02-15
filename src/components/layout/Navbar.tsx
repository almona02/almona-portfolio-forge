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
  Factory
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { useTranslation } from "react-i18next";

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
  icon?: string;
}

const Navbar: React.FC<NavbarProps> = ({ user: propUser, quoteItems: _quoteItems = [], onLogout }) => {
  const { t } = useTranslation('translation');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
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

  // Check if unified workflow is enabled
  const unifiedEnabled = useMemo(() => {
    if (typeof window !== 'undefined') {
      const preference = localStorage.getItem('almona:unified-workflow');
      return preference === 'true' || preference === null; // Default: enabled
    }
    return true;
  }, []);

  // Navigation configuration - Unified: 4 items max (Projects, Workflow, Studio, User)
  const navItems = useMemo<NavItem[]>(() => {
    if (unifiedEnabled && user) {
      // Unified 4-item navigation for authenticated users
      return [
        {
          name: 'Projects',
          path: "/fabricator/studio/projects",
          type: "link",
          icon: "Factory"
        },
        {
          name: 'Workflow',
          path: "/fabricator/workflow/engineering-bay",
          type: "link",
          badge: "UNIFIED",
          icon: "Factory"
        },
        {
          name: 'Studio',
          path: "/fabricator/studio",
          type: "dropdown",
          icon: "Factory",
          items: [
            { 
              name: 'Profile Studio', 
              path: "/fabricator/profile-studio", 
              description: "Import & tune profiles",
              icon: "Factory"
            },
            { 
              name: 'System Pack Studio', 
              path: "/fabricator/system-pack-studio", 
              description: "Configure system packs",
              icon: "Factory"
            },
            { 
              name: 'Tuning Studio', 
              path: "/fabricator/tuning-studio", 
              description: "Advanced tuning tools",
              icon: "Factory"
            }
          ]
        },
        {
          name: 'User',
          path: "/settings",
          type: "dropdown",
          icon: "Factory",
          items: [
            { 
              name: 'Settings', 
              path: "/settings", 
              description: "Account & preferences",
              icon: "Factory"
            },
            { 
              name: 'Customers', 
              path: "/fabricator/customers", 
              description: "Client management",
              icon: "Factory"
            },
            { 
              name: 'Inventory', 
              path: "/fabricator/inventory", 
              description: "Stock & remnants",
              icon: "Factory"
            }
          ]
        }
      ];
    }

    // Legacy navigation (for non-authenticated users or when unified is disabled)
    return [
      { name: t('navigation.home', 'Home'), path: "/", type: "link" },
      { 
        name: t('navigation.products.title', 'Products'), 
        path: "/products", 
        type: "dropdown",
        items: [
          { name: t('navigation.products.yilmaz_machines.name', 'YILMAZ Machines'), path: "/products/machines", description: t('navigation.products.yilmaz_machines.description', 'Industrial machinery solutions') },
          { name: t('navigation.products.3d_configurator.name', '3D Configurator'), path: "/products/configurator", description: t('navigation.products.3d_configurator.description', 'Customize in real-time') },
          { name: t('navigation.products.ar_viewer.name', 'AR Viewer'), path: "/products/3d-gallery#swiftxr", description: t('navigation.products.ar_viewer.description', 'See it in your space') },
          { name: t('navigation.products.3d_gallery.name', '3D Gallery'), path: "/products/3d-gallery", description: t('navigation.products.3d_gallery.description', 'Interactive 3D model collection') },
        ]
      },
      { 
        name: t('navigation.services.title', 'Services'), 
        path: "/services", 
        type: "dropdown",
        badge: "PRO",
        items: [
          { name: t('navigation.services.all_services.name', 'All Services'), path: "/services", description: t('navigation.services.all_services.description', 'Complete AI-powered services overview') },
          { name: t('navigation.services.ai_equipment_advisor.name', 'AI Equipment Advisor'), path: "/services/ai-advisor", description: t('navigation.services.ai_equipment_advisor.description', 'Smart recommendations') },
          { name: t('navigation.services.machine_sales.name', 'Machine Sales'), path: "/services/sales", description: t('navigation.services.machine_sales.description', 'Best deals guaranteed') },
          { name: t('navigation.services.technical_training.name', 'Technical Training'), path: "/services/training", description: t('navigation.services.technical_training.description', 'Expert-led sessions') },
          { name: t('navigation.services.fabrication_services.name', 'Fabrication Services'), path: "/fabrication-services", description: t('navigation.services.fabrication_services.description', 'Precision engineering') }
        ]
      },
      { 
        name: t('navigation.fabricator_pro', 'Fabricator Pro'), 
        path: "/fabricator", 
        type: user ? "dropdown" : "link", 
        badge: "BETA",
        icon: "Factory",
        items: user ? [
          { 
            name: '🇪🇬 Egypt Pilot', 
            path: "/fabricator-workflow", 
            description: "Panda 50 system validation",
            icon: "Factory"
          },
          { 
            name: '🇹🇷 Turkish Pilot', 
            path: "/fabricator/profile-studio", 
            description: "Custom profile import & tuning",
            icon: "Factory"
          }
        ] : undefined
      },
      { name: t('navigation.smart_shop', 'Smart Shop'), path: "/shop", type: "link", badge: "SOON" },
      { name: t('navigation.about', 'About'), path: "/about", type: "link" },
      { name: t('navigation.contact', 'Contact'), path: "/contact", type: "link" },
    ];
  }, [t, user, unifiedEnabled]);

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
    setIsLoggingOut(false);
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    try {
      setIsLoggingOut(true);
      await (onLogout ? onLogout() : signOut?.());
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setIsLoggingOut(false);
      closeAllDropdowns();
    }
  }, [isLoggingOut, onLogout, signOut, closeAllDropdowns]);

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
        return `${baseStyles} text-white bg-gradient-to-r from-amber-500 to-orange-500`;
      case "BETA":
        return `${baseStyles} text-white bg-gradient-to-r from-amber-500 to-orange-500`;
      case "SOON":
        return `${baseStyles} text-white bg-gradient-to-r from-amber-500 to-amber-500`;
      case "NEW":
        return `${baseStyles} text-white bg-gradient-to-r from-green-500 to-emerald-500`;
      default:
        return `${baseStyles} text-white bg-slate-700`;
    }
  }, []);

  return (
    <nav 
      ref={navbarRef}
      dir="ltr"
      style={{ direction: "ltr" }}
      className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-200 ${
        isScrolled 
          ? "bg-black/95 border-b border-amber-500/30 shadow-2xl" 
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
            <span className="bg-gradient-to-r from-amber-200 to-red-200 bg-clip-text text-transparent text-base sm:text-lg md:text-xl lg:text-xl xl:text-xl 2xl:text-3xl font-extrabold whitespace-nowrap">
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
                        ? "text-amber-400 bg-gradient-to-r from-amber-500/10 to-red-500/10"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                    onClick={closeAllDropdowns}
                    aria-label={`Navigate to ${item.name} page`}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon === "Factory" && <Factory className="h-4 w-4" />}
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
                        ? "text-amber-400 bg-gradient-to-r from-amber-500/10 to-red-500/10"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                    aria-haspopup="true"
                    aria-expanded={activeDropdown === item.name}
                    aria-label={`Open ${item.name} dropdown menu`}
                  >
                    {item.icon === "Factory" && <Factory className="h-4 w-4" />}
                    <span>{item.name}</span>
                    {item.badge && <span className={getBadgeStyles(item.badge)}>{item.badge}</span>}
                    <ChevronDown className={`h-4 w-4 transition-transform ${activeDropdown === item.name ? 'rotate-180' : ''}`} />
                  </button>

                  {activeDropdown === item.name && (
                      <div
                        className="absolute top-full left-0 mt-2 w-72 xl:w-80 2xl:w-96 bg-gray-900/95 border 500/30 rounded-xl shadow-2xl overflow-hidden navbar-dropdown-enter card-glass-dark"
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
                                className="block p-3 rounded-xl transition-all duration-200 text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-red-500/10"
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
            {/* Language Switcher */}
            <LanguageSwitcher 
              variant="icons" 
              className="px-1.5 py-1" 
            />
            
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
                  <div className="w-6 h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 bg-gradient-to-r from-amber-500 to-red-500 rounded-full flex items-center justify-center text-white text-xs xl:text-xs 2xl:text-sm font-bold flex-shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Hide email/name text on right side; keep avatar only */}
                  <ChevronDown className={`h-3 w-3 xl:h-3 xl:w-3 2xl:h-3.5 2xl:w-3.5 transition-transform flex-shrink-0 ${activeDropdown === "user" ? "rotate-180" : ""}`} />
                </button>

                {activeDropdown === "user" && (
                    <div
                      className="absolute right-0 top-full mt-2 w-56 xl:w-64 2xl:w-72 bg-gray-900/95 border 500/30 rounded-xl shadow-2xl overflow-hidden navbar-dropdown-enter card-glass-dark"
                      style={{ zIndex: 10000 }}
                    >
                      <div className="p-3 border-b border-amber-500/20">
                        <div className="font-medium text-white">{user.name || 'User'}</div>
                        <div className="text-sm text-gray-400 truncate">
                          {user.role === 'admin' ? 'Administrator' : user.role === 'user' ? 'User' : user.role || 'User'}
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        {user.role === "admin" && (
                          <Link
                            to="/admin"
                            className="flex items-center gap-3 px-3 py-3 text-sm text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-red-500/10 rounded-xl transition-all duration-200"
                            onClick={closeAllDropdowns}
                            aria-label="Navigate to admin panel"
                          >
                            <Shield className="h-4 w-4" />
                            <span>Admin Panel</span>
                          </Link>
                        )}
                        <Link
                          to="/portal"
                          className="flex items-center gap-3 px-3 py-3 text-sm text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-red-500/10 rounded-xl transition-all duration-200"
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
                            className="w-full flex items-center gap-3 px-3 py-3 text-sm text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-amber-500/10 hover:to-red-500/10 rounded-xl transition-all duration-200 text-left"
                            aria-label="Logout"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>Logout</span>
                          </button>
                        ) : (
                          <div className="w-full px-3 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/30 space-y-2">
                            <div className="text-sm text-white font-semibold">Confirm logout?</div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="flex-1 px-3 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {isLoggingOut ? "Logging out..." : "Yes, logout"}
                              </button>
                              <button
                                onClick={() => setConfirmLogout(false)}
                                className="flex-1 px-3 py-2 text-sm font-semibold text-gray-200 rounded-lg border border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition-colors card-dark"
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
                  className="px-2.5 py-1.5 xl:px-3 xl:py-2 2xl:px-3.5 2xl:py-2 text-xs xl:text-xs 2xl:text-sm bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-xl hover:from-amber-600 hover:to-red-600 transition-all duration-200 font-medium shadow-lg whitespace-nowrap"
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
              className="lg:hidden border-t bg-black/98 -xl max-h-[calc(100vh-4rem)] overflow-y-auto mobile-menu-enter card-glass-dark"
            >
              <div className="py-4 space-y-1 px-2">
                {navItems.map((item) => (
                  <div key={item.name} className="px-1">
                    {item.type === "link" ? (
                      <Link
                        to={item.path}
                        className={`block px-4 py-3 sm:py-4 text-base sm:text-lg font-semibold transition-all duration-200 rounded-xl ${
                          isActivePath(item.path)
                            ? "text-amber-400 bg-gradient-to-r from-amber-500/10 to-red-500/10"
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
                              ? "text-amber-400 bg-gradient-to-r from-amber-500/10 to-red-500/10"
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
                                  className="btn-primary"
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
                <div className="pt-4 border-t border-amber-500/30 mt-4">
                  {/* Language Switcher - Mobile */}
                  <div className="px-2 mb-4">
                    <LanguageSwitcher 
                      variant="minimal" 
                      className="w-full border-gray-700/50 hover: text-gray-300 hover:text-white bg-transparent hover:bg-white/5 rounded-xl px-4 py-3 justify-center -sm transition-all duration-200 card-glass-dark" 
                    />
                  </div>
                  
                  {user ? (
                    <div className="space-y-2 px-2">
                      <div className="px-4 py-3 text-gray-300 border border-amber-500/20 rounded-xl">
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
                        className="block px-4 py-3 sm:py-4 bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-xl hover:from-amber-600 hover:to-red-600 transition-all duration-200 text-center font-semibold shadow-lg text-sm sm:text-base"
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
