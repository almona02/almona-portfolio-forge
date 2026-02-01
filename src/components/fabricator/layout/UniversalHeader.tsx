import React from 'react';
import { cn } from '@/lib/utils';
import { Home, ChevronRight, Sun, Moon, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useTheme, useSetTheme } from '@/stores/fabricatorUIStore';
import { Link } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface UniversalHeaderProps {
  breadcrumbs?: Breadcrumb[];
  title: string;
  status?: 'normal' | 'warning' | 'error' | 'success';
  statusMessage?: string;
  showCostCalculator?: boolean;
  cost?: number;
  currency?: string;
  className?: string;
}

export const UniversalHeader: React.FC<UniversalHeaderProps> = ({
  breadcrumbs = [{ label: 'Home', href: '/' }],
  title,
  status = 'normal',
  statusMessage,
  showCostCalculator = false,
  cost = 0,
  currency = 'EGP',
  className = '',
}) => {
  const theme = useTheme();
  const setTheme = useSetTheme();
  
  const getStatusIcon = () => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <div className="w-2 h-2 rounded-full bg-green-500" />;
    }
  };
  
  const formatCost = (amount: number) => {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const handleThemeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };
  
  return (
    <header className={cn(
      'flex items-center justify-between w-full h-16 px-4 border-b',
      'bg-gray-900/80 border-amber-600/30 backdrop-blur-sm',
      className
    )}>
      {/* Left: Breadcrumbs */}
      <div className="flex items-center space-x-2">
        <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index === 0 ? (
                <Link
                  to={crumb.href || '#'}
                  className="flex items-center text-gray-400 hover:text-amber-400 transition-colors"
                >
                  <Home className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                  {crumb.href ? (
                    <Link
                      to={crumb.href}
                      className="text-gray-400 hover:text-amber-400 transition-colors truncate max-w-[150px]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-300 truncate max-w-[150px]">{crumb.label}</span>
                  )}
                </>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
      
      {/* Center: Title with status */}
      <div className="flex items-center justify-center flex-1">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-semibold text-gray-100 truncate max-w-md">{title}</h1>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            {statusMessage && (
              <span className={cn(
                'text-sm',
                status === 'error' && 'text-red-400',
                status === 'warning' && 'text-amber-400',
                status === 'success' && 'text-green-400',
                status === 'normal' && 'text-gray-400'
              )}>
                {statusMessage}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Right: Actions */}
      <div className="flex items-center space-x-4">
        {/* Cost Calculator */}
        {showCostCalculator && (
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 rounded-lg bg-gray-800/50 border border-amber-600/30">
              <span className="text-sm font-medium text-amber-400">
                {formatCost(cost)}
              </span>
            </div>
          </div>
        )}
        
        {/* Theme Toggle */}
        <button
          onClick={handleThemeToggle}
          className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {/* User Menu (placeholder) */}
        <button
          className="p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
          aria-label="User menu"
        >
          <User className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </header>
  );
};
