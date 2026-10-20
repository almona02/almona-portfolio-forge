import React from 'react';
import { useLocation } from 'react-router-dom';
import StandardNavbar from './Navbar';
import MarketplaceHeader from '@/components/used-machines/MarketplaceHeader';

interface ConditionalNavbarProps {
  user?: {
    name: string;
    email: string;
    role: string;
  };
  quoteItems?: unknown[];
  onLogout?: () => void;
  currentWorkflow?: string;
  onWorkflowChange?: (workflow: string) => void;
}

const ConditionalNavbar: React.FC<ConditionalNavbarProps> = (props) => {
  const location = useLocation();

  const pathname = location.pathname;
  const isFabricatorRoute =
    pathname.startsWith('/fabricator') || pathname.startsWith('/fabricator-workflow');
  const isMarketplaceRoute =
    pathname.startsWith('/used-machines') || pathname.startsWith('/usedmachines');

  // For fabricator routes, don't render navbar here - MasterLayout already includes UniversalNavSidebar
  // Returning null prevents duplicate sidebars
  if (isFabricatorRoute) {
    return null;
  }

  // The used-machines marketplace is a neutral C2C surface: render its minimal
  // header instead of the marketing navigation.
  if (isMarketplaceRoute) {
    return <MarketplaceHeader />;
  }

  // For non-fabricator, non-marketplace routes, use StandardNavbar
  return <StandardNavbar {...props} />;
};

export default ConditionalNavbar;
