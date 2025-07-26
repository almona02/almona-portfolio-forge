
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Menu, Search, ShoppingCart, X } from "lucide-react";
import { useQuote } from "@/context/QuoteContext";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { quoteItems } = useQuote();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
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
    { name: "Home", path: "/" },
    { name: "YILMAZ Machines", path: "/products/machines" },
    // Removed UPVC Windows, UPVC Doors, Aluminum Thermal Break as per user request
    { name: "Fabrication Workflow Detail", path: "/workflows/fabrication-detail" },
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
    <header
      className={`fixed w-full top-0 left-0 z-50 transition-all duration-300 ${
        isScrolled ? "py-2 bg-almona-dark-default/90 backdrop-blur-md shadow-lg" : "py-4 bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-3xl font-bold text-gradient-orange">ALMONA</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`text-sm font-medium transition-colors hover:text-almona-orange relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-almona-orange after:transition-all after:duration-300 ${
                isActive(link.path)
                  ? "text-almona-orange after:w-full"
                  : "text-gray-300"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Search className="h-5 w-5" />
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
          <Button 
            variant="default" 
            className="bg-gradient-orange hover:bg-almona-orange-dark text-white"
            asChild
          >
            <Link to="/shop">
              Shop Now
            </Link>
          </Button>
          {user ? (
            <Button variant="ghost" onClick={logout}>
              Logout
            </Button>
          ) : (
            <Button variant="ghost" asChild>
              <Link to="/login">
                Login
              </Link>
            </Button>
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
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-almona-dark-default/95 z-50 flex flex-col animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <span className="text-2xl font-bold text-gradient-orange">ALMONA</span>
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
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={handleCloseMobileMenu}
                  className={`text-lg font-medium transition-colors hover:text-almona-orange flex items-center gap-3 ${
                    isActive(link.path)
                      ? "text-almona-orange"
                      : "text-gray-300"
                  }`}
                >
                  {link.name === "Home" && <Home className="h-5 w-5" />}
                  {link.name}
                </Link>
              ))}
            </nav>
            <div className="mt-auto p-4 border-t border-gray-800">
              <Button 
                variant="default" 
                className="w-full bg-gradient-orange hover:bg-almona-orange-dark text-white mb-4"
                asChild
              >
                <Link to="/shop" onClick={handleCloseMobileMenu}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Shop Now
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                asChild
              >
                <Link to="/quote" onClick={handleCloseMobileMenu}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  View Quote ({quoteItems.length})
                </Link>
              </Button>
              {user ? (
                <Button variant="outline" className="w-full" onClick={logout}>
                  Logout
                </Button>
              ) : (
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login" onClick={handleCloseMobileMenu}>
                    Login
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
