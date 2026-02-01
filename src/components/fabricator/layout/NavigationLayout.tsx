import React from 'react';
import { cn } from '@/lib/utils';
import { UniversalNavSidebar } from './UniversalNavSidebar';

interface NavigationLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const NavigationLayout: React.FC<NavigationLayoutProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={cn('flex h-screen w-screen overflow-hidden', className)}>
      {/* Universal Navigation Sidebar */}
      <UniversalNavSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
