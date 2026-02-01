import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Menu, 
  X, 
  ChevronDown, 
  ShoppingCart, 
  User, 
  LogOut,
  Globe,
  Shield
} from "lucide-react";

interface NavbarProps {
  user?: {
    name: string;
    email: string;
    role: string;
  };
  quoteItems?: any[];
  onLogout?: () => void;
}

const Navbar = ({ user, quoteItems = [], onLogout }: NavbarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const _navigate = useNavigate();
  const navbarRef = useRef<HTMLElement>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout>();

  // Navigation items
  const navItems = [
    { name: "Home", path: "/", type: "link" },
    { 
      name: "Products", 
      path: "/products", 
      type: "dropdown",
      items: [
        { name: "YILMAZ Machines", path: "/products/machines" },
        { name: "3D Configurator", path: "/products/configurator" },
        { name: "AR Viewer", path: "/products/3d-gallery#swiftxr" },
      ]
    },
    { 
      name: "Services", 
      path: "/services", 
      type: "dropdown",
      items: [
        { name: "AI Equipment Advisor", path: "/services/ai-advisor" },
        { name: "Machine Sales", path: "/services/sales" },
        { name: "Technical Training", path: "/services/training" },
        { name: "Fabrication Services", path: "/fabrication-services" },
        { name: "Fabricator Workflow Pro", path: "/fabricator-workflow" },
      ]
    },
    { name: "Smart Shop", path: "/shop", type: "link" },
    { name: "About", path: "/about", type: "link" },
    { name: "Contact", path: "/contact", type: "link" },
  ];

  // Regions
  const regions = [
    { code: "TR", name: "Turkey", flag: "🇹🇷" },
    { code: "EG", name: "Egypt", flag: "🇪🇬" },
    { code: "INT", name: "International", flag: "🌍" },
  ];

  // Close dropdowns with delay for better UX
  const handleDropdownEnter = (dropdownName: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setActiveDropdown(dropdownName);
  };

  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
  };

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 10;
      setIsScrolled(scrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActivePath = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav 
      ref={navbarRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-black/95 backdrop-blur-lg border-b border-amber-500/20 shadow-lg" 
          : "bg-black/80 backdrop-blur-md"
      }`}
    >
      <div className="container mx-auto px-4">
        {/* Main Navbar */}
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 text-white font-bold text-xl"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span>ALMONA</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <div
                key={item.name}
                className="relative"
                onMouseEnter={() => item.type === "dropdown" && handleDropdownEnter(item.name)}
                onMouseLeave={handleDropdownLeave}
              >
                {item.type === "link" ? (
                  <Link
                    to={item.path}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                      isActivePath(item.path)
                        ? "text-amber-400 bg-amber-500/10"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.name}
                  </Link>
                ) : (
                  <>
                    <button
                      className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium flex items-center space-x-1 ${
                        isActivePath(item.path) || activeDropdown === item.name
                          ? "text-amber-400 bg-amber-500/10"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span>{item.name}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${
                        activeDropdown === item.name ? "rotate-180" : ""
                      }`} />
                    </button>

                    {/* Dropdown Menu */}
                    {activeDropdown === item.name && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900/95 border 500/20 rounded-xl shadow-2xl overflow-hidden card-glass-dark">
                        <div className="p-2">
                          {item.items?.map((subItem) => (
                            <Link
                              key={subItem.name}
                              to={subItem.path}
                              className="btn-primary"
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center space-x-3">
            {/* Region Selector */}
            <div className="relative">
              <button
                className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                onClick={() => setActiveDropdown(activeDropdown === "region" ? null : "region")}
              >
                <Globe className="h-4 w-4" />
                <span className="text-sm">TR</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {activeDropdown === "region" && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900/95 border 500/20 rounded-xl shadow-2xl overflow-hidden card-glass-dark">
                  <div className="p-2">
                    {regions.map((region) => (
                      <button
                        key={region.code}
                        className="btn-primary"
                      >
                        <span className="text-lg">{region.flag}</span>
                        <span>{region.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quote Cart */}
            <Link
              to="/quote"
              className="relative p-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
            >
              <ShoppingCart className="h-5 w-5" />
              {quoteItems.length > 0 && (
                <span className="btn-primary">
                  {quoteItems.length}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200"
                  onClick={() => setActiveDropdown(activeDropdown === "user" ? null : "user")}
                >
                  <User className="h-5 w-5" />
                  <span className="text-sm">{user.name}</span>
                </button>

                {activeDropdown === "user" && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-gray-900/95 border 500/20 rounded-xl shadow-2xl overflow-hidden card-glass-dark">
                    <div className="p-2 space-y-1">
                      {user.role === "admin" && (
                        <Link
                          to="/admin"
                          className="btn-primary"
                        >
                          <Shield className="h-4 w-4" />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      <Link
                        to="/portal"
                        className="btn-primary"
                      >
                        <User className="h-4 w-4" />
                        <span>My Portal</span>
                      </Link>
                      <button
                        onClick={onLogout}
                        className="btn-primary"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-300 hover:text-white transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-lg hover:from-amber-600 hover:to-red-600 transition-all duration-200"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-gray-300 hover:text-white transition-all duration-200"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t bg-black/95 -lg card-glass-dark">
            <div className="py-4 space-y-2">
              {navItems.map((item) => (
                <div key={item.name}>
                  {item.type === "link" ? (
                    <Link
                      to={item.path}
                      className={`block px-4 py-3 text-lg font-medium transition-all duration-200 ${
                        isActivePath(item.path)
                          ? "text-amber-400 bg-amber-500/10"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {item.name}
                    </Link>
                  ) : (
                    <div>
                      <button
                        className={`w-full text-left px-4 py-3 text-lg font-medium flex items-center justify-between transition-all duration-200 ${
                          isActivePath(item.path) || activeDropdown === item.name
                            ? "text-amber-400 bg-amber-500/10"
                            : "text-gray-300 hover:text-white hover:bg-white/5"
                        }`}
                        onClick={() => setActiveDropdown(activeDropdown === item.name ? null : item.name)}
                      >
                        <span>{item.name}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${
                          activeDropdown === item.name ? "rotate-180" : ""
                        }`} />
                      </button>

                      {activeDropdown === item.name && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.items?.map((subItem) => (
                            <Link
                              key={subItem.name}
                              to={subItem.path}
                              className="btn-primary"
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Mobile User Actions */}
              <div className="pt-4 border-t border-amber-500/20">
                {user ? (
                  <div className="space-y-2">
                    <div className="px-4 py-2 text-gray-300">
                      Welcome, {user.name}
                    </div>
                    <Link
                      to="/portal"
                      className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                    >
                      My Portal
                    </Link>
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-200"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="block px-4 py-3 bg-gradient-to-r from-amber-500 to-red-500 text-white text-center rounded-lg hover:from-amber-600 hover:to-red-600 transition-all duration-200"
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
