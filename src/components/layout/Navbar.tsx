import { Button } from "@/components/ui/button";
import NewLogo from "@/assets/logo.png";
import { useAuth } from "@/context/AuthContext";
import { useQuote } from "@/context/QuoteContext";
import { AnimatePresence, motion } from "framer-motion";
import {
  Info,
  Mail,
  Menu,
  Settings,
  ShoppingCart,
  Store,
  Users,
  Wrench,
  X,
  ChevronDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

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
        className={`${ 
          isActive ? "text-white" : "text-gray-400 group-hover:text-white"
        }`}
      >
        {children}
      </span>
      {!isMobile && (
        <motion.div
          className={`absolute -bottom-2 left-0 right-0 h-0.5 bg-almona-orange origin-center transform scale-x-0 transition-transform duration-300 group-hover:scale-x-100 ${
            isActive ? "scale-x-100" : ""
          }`}
        />
      )}
    </Link>
  );
};

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [servicesSubmenuOpen, setServicesSubmenuOpen] = useState(false);
  const [productsSubmenuOpen, setProductsSubmenuOpen] = useState(false);
  const location = useLocation();
  const { quoteItems } = useQuote();
  const { user, signOut } = useAuth();

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

  const servicesSubmenu = [
    { name: "Machine Sales", path: "/services/sales" },
    { name: "Maintenance & Support", path: "/services/maintenance" },
    { name: "Spare Parts", path: "/spare-parts" },
    { name: "Technical Training", path: "/services/training" },
    { name: "Fabrication Services", path: "/fabrication-services" },
    { name: "Fabrication Workflow", path: "/workflows/fabrication-detail" },
    { name: "Consulting", path: "/services/consulting" },
  ];

  const productsSubmenu = [
    { name: "YILMAZ Machines", path: "/products/machines" },
  ];

  const navLinks = [
    {
      name: "Products",
      path: "/products",
      icon: <Settings className="h-5 w-5" />,
      hasSubmenu: true,
    },
    {
      name: "Services",
      path: "/services",
      icon: <Users className="h-5 w-5" />,
      hasSubmenu: true,
    },
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
        isScrolled
          ? "bg-almona-dark/98 backdrop-blur-xl shadow-lg border-b border-almona-light/10"
          : "bg-almona-dark/20 backdrop-blur-sm"
      } py-3`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <img
              src={NewLogo}
              alt="Almona Logo"
              className={`relative w-auto transition-all duration-500 ${
                isScrolled 
                  ? "h-8" 
                  : "h-10"
              }`}
            />
          </motion.div>
          
          <motion.span
            className={`text-2xl sm:text-3xl font-bold transition-all duration-500 ${
              isScrolled
                ? "drop-shadow-md"
                : "drop-shadow-2xl"
            }`}
            style={{
              background: isScrolled 
                ? 'linear-gradient(135deg, #ff8c00, #ffa500)'
                : 'linear-gradient(135deg, #ff8c00, #ffa500, #ffffff, #e2e8f0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: isScrolled 
                ? 'drop-shadow(0 2px 4px rgba(255, 140, 0, 0.4))' 
                : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 0 15px rgba(255, 255, 255, 0.2))'
            }}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            whileHover={{
              scale: 1.02,
              filter: isScrolled 
                ? 'drop-shadow(0 4px 8px rgba(255, 140, 0, 0.6))' 
                : 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 25px rgba(255, 255, 255, 0.4))'
            }}
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
              className="relative"
            >
              {link.hasSubmenu ? (
                <div
                  className="relative group"
                  onMouseEnter={() => {
                    if (link.name === "Services") {
                      setServicesSubmenuOpen(true);
                      setProductsSubmenuOpen(false);
                    } else if (link.name === "Products") {
                      setProductsSubmenuOpen(true);
                      setServicesSubmenuOpen(false);
                    }
                  }}
                  onMouseLeave={() => {
                    setServicesSubmenuOpen(false);
                    setProductsSubmenuOpen(false);
                  }}
                >
                  <div className="flex items-center gap-1 cursor-pointer">
                    <NavLink to={link.path} isActive={isActive(link.path)}>
                      {link.name}
                    </NavLink>
                    <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                  
                  <AnimatePresence>
                    {(servicesSubmenuOpen && link.name === "Services") && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 w-56 bg-almona-dark/95 backdrop-blur-lg border border-almona-light/20 rounded-lg shadow-xl z-50"
                      >
                        <div className="py-2">
                          {servicesSubmenu.map((submenuItem) => (
                            <Link
                              key={submenuItem.name}
                              to={submenuItem.path}
                              className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-almona-light/10 transition-colors"
                            >
                              {submenuItem.name}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    {(productsSubmenuOpen && link.name === "Products") && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 w-56 bg-almona-dark/95 backdrop-blur-lg border border-almona-light/20 rounded-lg shadow-xl z-50"
                      >
                        <div className="py-2">
                          {productsSubmenu.map((submenuItem) => (
                            <Link
                              key={submenuItem.name}
                              to={submenuItem.path}
                              className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-almona-light/10 transition-colors"
                            >
                              {submenuItem.name}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <NavLink to={link.path} isActive={isActive(link.path)}>
                  {link.name}
                </NavLink>
              )}
            </motion.div>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          >
            <Button size="icon" asChild className="bg-transparent">
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
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.3 }}
              >
                <Button
                  onClick={signOut}
                  className="text-gray-300 hover:text-white bg-transparent"
                >
                  Logout
                </Button>
              </motion.div>
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.3 }}
              >
                <Button
                  className="bg-gradient-orange hover:bg-almona-orange-dark text-white rounded-full px-6"
                  asChild
                >
                  <Link to="/portal">Portal</Link>
                </Button>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.3 }}
              >
                <Button
                  asChild
                  className="text-gray-300 hover:text-white bg-transparent"
                >
                  <Link to="/login">Login</Link>
                </Button>
              </motion.div>
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.3 }}
              >
                <Button
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
          size="icon"
          className="lg:hidden text-gray-300 hover:text-white bg-transparent"
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
                  <div className="flex items-center gap-3">
                    <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-almona-orange/20 via-almona-orange/10 to-transparent backdrop-blur-md border border-almona-orange/30 shadow-lg">
                      {/* Glow effect */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-almona-orange/10 to-transparent blur-sm" />
                      
                      <img
                        src={NewLogo}
                        alt="Almona Logo"
                        className="relative h-8 w-auto opacity-95 brightness-110 contrast-115 saturate-125"
                        style={{
                          filter: 'drop-shadow(0 3px 8px rgba(255, 95, 31, 0.7)) hue-rotate(8deg)',
                          imageRendering: 'auto',
                          WebkitBackfaceVisibility: 'hidden',
                          backfaceVisibility: 'hidden',
                          transform: 'translateZ(0)',
                          mixBlendMode: 'normal'
                        }}
                      />
                    </div>
                    <span 
                      className="text-xl font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #ff8c00 0%, #ffa500 80%, #ffb347 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        filter: 'drop-shadow(0 2px 4px rgba(255, 140, 0, 0.4))'
                      }}
                    >
                      ALMONA
                    </span>
                  </div>
                  <Button
                    size="icon"
                    onClick={handleCloseMobileMenu}
                    className="text-gray-300 hover:text-white bg-transparent"
                  >
                    <X className="h-7 w-7" />
                  </Button>
                </div>
                <nav className="flex flex-col p-6 space-y-2 mt-4">
                  {navLinks.map((link) => (
                    <div key={link.name}>
                      {link.hasSubmenu ? (
                        <div>
                          <div
                            className="flex items-center justify-between py-2 cursor-pointer"
                            onClick={() => {
                              if (link.name === "Services") {
                                setServicesSubmenuOpen(!servicesSubmenuOpen);
                                setProductsSubmenuOpen(false);
                              } else if (link.name === "Products") {
                                setProductsSubmenuOpen(!productsSubmenuOpen);
                                setServicesSubmenuOpen(false);
                              }
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <span className="text-almona-orange">{link.icon}</span>
                              <span className="text-lg text-gray-400 hover:text-white">
                                {link.name}
                              </span>
                            </div>
                            <ChevronDown 
                              className={`h-4 w-4 text-gray-400 transition-transform ${
                                (link.name === "Services" && servicesSubmenuOpen) || 
                                (link.name === "Products" && productsSubmenuOpen) ? 'rotate-180' : ''
                              }`} 
                            />
                          </div>
                          <AnimatePresence>
                            {(servicesSubmenuOpen && link.name === "Services") && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="ml-8 space-y-1"
                              >
                                {servicesSubmenu.map((submenuItem) => (
                                  <Link
                                    key={submenuItem.name}
                                    to={submenuItem.path}
                                    onClick={handleCloseMobileMenu}
                                    className="block py-2 text-gray-400 hover:text-white transition-colors"
                                  >
                                    {submenuItem.name}
                                  </Link>
                                ))}
                              </motion.div>
                            )}
                            {(productsSubmenuOpen && link.name === "Products") && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="ml-8 space-y-1"
                              >
                                {productsSubmenu.map((submenuItem) => (
                                  <Link
                                    key={submenuItem.name}
                                    to={submenuItem.path}
                                    onClick={handleCloseMobileMenu}
                                    className="block py-2 text-gray-400 hover:text-white transition-colors"
                                  >
                                    {submenuItem.name}
                                  </Link>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <NavLink
                          to={link.path}
                          isActive={isActive(link.path)}
                          isMobile
                          onClick={handleCloseMobileMenu}
                          icon={link.icon}
                        >
                          {link.name}
                        </NavLink>
                      )}
                    </div>
                  ))}
                </nav>
                <div className="mt-auto p-6 border-t border-gray-800 space-y-4">
                  {user ? (
                    <>
                      <Button
                        className="w-full border-almona-light/30 text-white hover:bg-almona-light/10"
                        onClick={signOut}
                      >
                        Logout
                      </Button>
                      <Button
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
                      <Button
                        className="w-full border-almona-light/30 text-white hover:bg-almona-light/10"
                        asChild
                      >
                        <Link to="/login" onClick={handleCloseMobileMenu}>
                          Login
                        </Link>
                      </Button>
                      <Button
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
