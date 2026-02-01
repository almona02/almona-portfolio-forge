import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { CollapsiblePanel } from './CollapsiblePanel';
import { UniversalHeader } from './UniversalHeader';
import { SectionId } from '@/stores/fabricatorUIStore';
import { Wrench, Settings } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface FabricatorWorkspaceLayoutProps {
  sectionId: SectionId;
  leftPanelContent?: React.ReactNode;
  rightPanelContent?: React.ReactNode;
  mainContent: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  leftPanelIcon?: React.ReactNode;
  rightPanelIcon?: React.ReactNode;
  leftPanelTitle?: string;
  rightPanelTitle?: string;
  breadcrumbs?: Breadcrumb[];
  title: string;
  status?: 'normal' | 'warning' | 'error' | 'success';
  statusMessage?: string;
  showCostCalculator?: boolean;
  cost?: number;
  currency?: string;
  className?: string;
  showLeftPanel?: boolean; // New: Allow disabling left panel (use UniversalNavSidebar instead)
  leftPanelWidth?: number; // Width of left panel when expanded (default: 240)
}

const FabricatorWorkspaceLayoutComponent: React.FC<FabricatorWorkspaceLayoutProps> = ({
  sectionId,
  leftPanelContent,
  rightPanelContent,
  mainContent,
  header,
  footer,
  leftPanelIcon = <Wrench size={18} />,
  rightPanelIcon = <Settings size={18} />,
  leftPanelTitle = 'Tools',
  rightPanelTitle = 'Properties',
  breadcrumbs,
  title,
  status = 'normal',
  statusMessage,
  showCostCalculator = false,
  cost = 0,
  currency = 'EGP',
  className = '',
  showLeftPanel = true,
  leftPanelWidth,
}) => {
  // Default breadcrumbs if not provided
  const defaultBreadcrumbs = breadcrumbs || [
    { label: 'Home', href: '/' },
    { label: title, href: '#' },
  ];
  
  return (
    <div className={cn('flex flex-col h-full w-full', className)}>
      {/* Header */}
      {header || (
        <UniversalHeader
          breadcrumbs={defaultBreadcrumbs}
          title={title}
          status={status}
          statusMessage={statusMessage}
          showCostCalculator={showCostCalculator}
          cost={cost}
          currency={currency}
        />
      )}
      
      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Only show if showLeftPanel is true AND leftPanelContent is provided */}
        {/* When showLeftPanel=false, tools should be integrated into UniversalNavSidebar */}
        {showLeftPanel && leftPanelContent && (
          <CollapsiblePanel
            position="left"
            sectionId={sectionId}
            icon={leftPanelIcon}
            title={leftPanelTitle}
            widthExpanded={leftPanelWidth}
          >
            {leftPanelContent}
          </CollapsiblePanel>
        )}
        
        {/* Main Content */}
        <main className="flex-1 overflow-hidden bg-gray-950">
          {mainContent}
        </main>
        
        {/* Right Panel */}
        {rightPanelContent && (
          <CollapsiblePanel
            position="right"
            sectionId={sectionId}
            icon={rightPanelIcon}
            title={rightPanelTitle}
          >
            {rightPanelContent}
          </CollapsiblePanel>
        )}
      </div>
      
      {/* Footer */}
      {footer && (
        <footer className="border-t border-amber-600/30 bg-gray-900/50">
          {footer}
        </footer>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders when props haven't changed
export const FabricatorWorkspaceLayout = memo(FabricatorWorkspaceLayoutComponent);

// Create a hook for using the layout
export const useFabricatorLayout = () => {
  return {
    // Helper functions for common patterns
    createSectionProps: (sectionId: SectionId, title: string) => ({
      sectionId,
      title,
    }),
  };
};
