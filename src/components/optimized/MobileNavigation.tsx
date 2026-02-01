import React, { memo, useState, useEffect } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/shared/ui/ui/sheet';
import { Menu, X, Home, Package, Wrench, Phone, User, ShoppingCart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface MobileNavigationProps {
  className?: string;
}

export const MobileNavigation = memo<MobileNavigationProps>(({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const navigationItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/services', label: 'Services', icon: Wrench },
    { path: '/shop', label: 'Shop', icon: ShoppingCart },
    { path: '/contact', label: 'Contact', icon: Phone },
    { path: '/portal', label: 'Portal', icon: User },
  ];

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`lg:hidden ${className}`}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-white hover:bg-white/10"
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        
        <SheetContent 
          side="left" 
          className="w-80 bg-gray-900 border-gray-800 p-0 card-dark"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-white font-semibold text-lg">ALMONA</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-6 py-4">
              <ul className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActivePath(item.path);
                  
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-lg
                          transition-colors duration-200
                          touch-manipulation
                          ${isActive 
                            ? 'bg-gradient-to-r from-amber-500/20 to-red-500/20 text-amber-400 border border-amber-500/30' 
                            : 'text-gray-300 hover:text-white hover:bg-gray-800'
                          }
                        `}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800">
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-3">
                  Industrial Machinery Solutions
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600"
                    asChild
                  >
                    <Link to="/quote">Get Quote</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                    asChild
                  >
                    <Link to="/contact">Contact</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});

MobileNavigation.displayName = 'MobileNavigation';
