import React from 'react';
import { cn } from '@/lib/utils';
import { Home, ChevronRight, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
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
  
  const getStatusIcon = () => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'error': return <XCircle className="w-4 h-4 text-destructive" />;
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
  
  
  return (
    <header className={cn(
      'flex flex-wrap items-center justify-between gap-2 w-full min-h-16 px-3 py-2 sm:px-4 border-b',
      'bg-background/80 border-amber-600/30 backdrop-blur-sm',
      className
    )}>
      {/* Left: Breadcrumbs */}
      <div className="hidden sm:flex min-w-0 items-center space-x-2">
        <nav className="flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index === 0 ? (
                <Link
                  to={crumb.href || '#'}
                  className="flex items-center text-muted-foreground hover:text-warning transition-colors"
                >
                  <Home className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  {crumb.href ? (
                    <Link
                      to={crumb.href}
                      className="text-muted-foreground hover:text-warning transition-colors truncate max-w-[150px]"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground truncate max-w-[150px]">{crumb.label}</span>
                  )}
                </>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>
      
      {/* Center: Title with status */}
      <div className="flex min-w-0 items-center sm:justify-center flex-1">
        <div className="flex min-w-0 items-center space-x-3">
          <h1 className="text-lg font-semibold text-foreground truncate max-w-md">{title}</h1>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            {statusMessage && (
              <span className={cn(
                'text-sm',
                status === 'error' && 'text-destructive',
                status === 'warning' && 'text-warning',
                status === 'success' && 'text-success',
                status === 'normal' && 'text-muted-foreground'
              )}>
                {statusMessage}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Right: Actions */}
      <div className="flex shrink-0 items-center space-x-2 sm:space-x-4">
        {/* Cost Calculator */}
        {showCostCalculator && (
          <div className="flex items-center space-x-2">
            <div className="px-3 py-1 rounded-lg bg-card/50 border border-amber-600/30">
              <span className="text-sm font-medium text-warning">
                {formatCost(cost)}
              </span>
            </div>
          </div>
        )}
        
        <ThemeToggle size="sm" />

        {/* User Menu (placeholder) */}
        <button
          className="p-2 rounded-lg hover:bg-card/50 transition-colors"
          aria-label="User menu"
        >
          <User className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
};
