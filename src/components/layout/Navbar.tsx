import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  Home,
  ShoppingCart,
  Phone,
  Mail,
  Settings,
  Package,
  Wrench,
  Users,
  Store,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuote } from "@/context/QuoteContext";
import { useAuth } from "@/context/AuthContext";

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  isActive: boolean;
  isMobile?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}

const NavLink = ({
  to,
  children,
  isActive,
  isMobile = false,
  onClick,
  icon,
}: NavLinkProps) => {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative text-sm font-medium transition-colors duration-300 group ${
        isMobile ? "text-lg flex items-center gap-4 py-2" : ""
      }`}
    >
      {isMobile && icon && <span className="text-almona-orange">{icon}</span>}
      <span
        className={`${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`}>
        {children}
      </span>
      {!isMobile && (
        <motion.div
          className={`absolute -bottom-2 left-0 right-0 h-0.5 bg-almona-orange origin-center transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100 ${isActive ? "scale-x-100" : ""}`}
        />
      )}
    </Link>
  );
};

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { quoteItems } = useQuote();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navLinks = [
    { name: "Home", path: "/", icon: <Home className="h-5 w-5" /> },
    { name: "YILMAZ Machines", path: "/products/machines", icon: <Settings className="h-5 w-5" /> },
    { name: "Fabrication Workflow", path: "/workflows/fabrication-detail", icon: <Wrench className="h-5 w-5" /> },
    { name: "Services", path: "/services", icon: <Users className="h-5 w-5" /> },
    { name: "Used Machines", path: "/usedmachines", icon: <Store className="h-5 w-5" /> },
    { name: "Shop", path: "/Shop", icon: <ShoppingCart className="h-5 w-5" /> },
    { name: "About Us", path: "/about", icon: <Info className="h-5 w-5" /> },
    { name: "Contact", path: "/contact", icon: <Mail className="h-5 w-5" /> },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 50, damping: 20 }}
      className={`fixed w-full top-0 left-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-almona-dark/95 backdrop-blur-lg shadow-lg" : "bg-transparent"
      } py-3`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <motion.img 
            src="/logo.png" 
            alt="Almona Logo" 
            className="h-10 w-auto" 
            initial={{ x: -50, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            transition={{ delay: 0.2, duration: 0.5 }}
          />
          <motion.span 
            className="text-3xl font-bold text-gradient-orange"
            initial={{ x: -50, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            ALMONA
          </motion.span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-8">
          {navLinks.map((link, index) => (
            <motion.div
              key={link.name}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + index * 0.05, duration: 0.3 }}
            >
              <NavLink
                to={link.path}
                isActive={isActive(link.path)}
              >
                {link.name}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7, duration: 0.3 }}>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/quote">
                <ShoppingCart className="h-6 w-6 text-gray-300 hover:text-white" />
                {quoteItems.length > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {quoteItems.length}
                  </span>
                )}
              </Link>
            </Button>
          </motion.div>
          {user ? (
            <>
              <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8, duration: 0.3 }}>
                <Button variant="ghost" onClick={logout} className="text-gray-300 hover:text-white">
                  Logout
                </Button>
              </motion.div>
              <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9, duration: 0.3 }}>
                <Button
                  variant="default"
                  className="bg-gradient-orange hover:bg-almona-orange-dark text-white rounded-full px-6"
                  asChild
                >
                  <Link to="/portal">Portal</Link>
                </Button>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8, duration: 0.3 }}>
                <Button variant="ghost" asChild className="text-gray-300 hover:text-white">
                  <Link to="/login">Login</Link>
                </Button>
              </motion.div>
              <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9, duration: 0.3 }}>
                <Button
                  variant="default"
                  className="bg-gradient-orange hover:bg-almona-orange-dark text-white rounded-full px-6"
                  asChild
                >
                  <Link to="/register">Register</Link>
                </Button>
              </motion.div>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-gray-300 hover:text-white"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="h-7 w-7" />
        </Button>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 z-40"
                onClick={handleCloseMobileMenu}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="lg:hidden fixed top-0 right-0 h-full w-full max-w-xs bg-almona-dark/95 backdrop-blur-xl z-50 flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <span className="text-2xl font-bold text-gradient-orange">
                    ALMONA
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseMobileMenu}
                    className="text-gray-300 hover:text-white"
                  >
                    <X className="h-7 w-7" />
                  </Button>
                </div>
                <nav className="flex flex-col p-6 space-y-2 mt-4">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.name}
                      to={link.path}
                      isActive={isActive(link.path)}
                      isMobile
                      onClick={handleCloseMobileMenu}
                      icon={link.icon}
                    >
                      {link.name}
                    </NavLink>
                  ))}
                </nav>
                <div className="mt-auto p-6 border-t border-gray-800 space-y-4">
                  {user ? (
                    <>
                      <Button
                        variant="outline"
                        className="w-full border-almona-light/30 text-white hover:bg-almona-light/10"
                        onClick={logout}
                      >
                        Logout
                      </Button>
                      <Button
                        variant="default"
                        className="w-full bg-gradient-orange hover:bg-almona-orange-dark text-white"
                        asChild
                      >
                        <Link to="/portal" onClick={handleCloseMobileMenu}>
                          Portal
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full border-almona-light/30 text-white hover:bg-almona-light/10" asChild>
                        <Link to="/login" onClick={handleCloseMobileMenu}>
                          Login
                        </Link>
                      </Button>
                      <Button
                        variant="default"
                        className="w-full bg-gradient-orange hover:bg-almona-orange-dark text-white"
                        asChild
                      >
                        <Link to="/register" onClick={handleCloseMobileMenu}>
                          Register
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

export default Navbar;
