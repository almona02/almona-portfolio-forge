import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Home, ShoppingCart, Phone, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuote } from "@/context/QuoteContext";
import { useAuth } from "@/context/AuthContext";

const NavLink = ({ to, children, isActive, isMobile, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={to}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative text-sm font-medium transition-colors duration-300 ${
        isActive
          ? "text-almona-orange"
          : "text-gray-300 hover:text-almona-orange-light"
      } ${isMobile ? "text-lg flex items-center gap-3" : ""}`}
    >
      <div name={children.props.name} />
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
      setIsScrolled(window.scrollY > 20);
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
    { name: "YILMAZ Machines", path: "/products/machines" },
    { name: "Fabrication Workflow", path: "/workflows/fabrication-detail" },
    { name: "Services", path: "/services" },
    { name: "Used Machines", path: "/usedmachines" },
    { name: "Shop", path: "/Shop" },
    { name: "About Us", path: "/about" },
    { name: "Contact", path: "/contact" },
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
      transition={{ type: "spring", stiffness: 50, damping: 15 }}
      className={`fixed w-full top-0 left-0 z-50 transition-all duration-300 py-4 bg-almona-dark/85 backdrop-blur-md shadow-2xl`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-3xl font-bold text-gradient-orange">
            ALMONA
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-8">
          {navLinks.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              isActive={isActive(link.path)}
            >
              <div name={link.name} />
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <ShoppingCart className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/quote">
              <ShoppingCart className="h-5 w-5" />
              {quoteItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {quoteItems.length}
                </span>
              )}
            </Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
              <Button
                variant="default"
                className="bg-gradient-orange hover:bg-almona-orange-dark text-white"
                asChild
              >
                <Link to="/portal">Portal</Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button
                variant="default"
                className="bg-gradient-orange hover:bg-almona-orange-dark text-white"
                asChild
              >
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-40"
                onClick={handleCloseMobileMenu}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="lg:hidden fixed top-0 right-0 h-full w-80 bg-almona-dark/85 backdrop-blur-xl z-50 flex flex-col"
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                  <span className="text-2xl font-bold text-gradient-orange">
                    ALMONA
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseMobileMenu}
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
                <nav className="flex flex-col p-4 space-y-6 mt-8">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.name}
                      to={link.path}
                      isActive={isActive(link.path)}
                      isMobile
                      onClick={handleCloseMobileMenu}
                    >
                      <div name={link.name} />
                    </NavLink>
                  ))}
                </nav>
                <div className="mt-auto p-4 border-t border-gray-800 space-y-4">
                  {user ? (
                    <>
                      <Button
                        variant="outline"
                        className="w-full"
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
                      <Button variant="outline" className="w-full" asChild>
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
