import React from 'react';
import { useLocation } from 'react-router-dom';
import StandardNavbar from './Navbar';

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

  // For fabricator routes, don't render navbar here - MasterLayout already includes UniversalNavSidebar
  // Returning null prevents duplicate sidebars
  if (isFabricatorRoute) {
    return null;
  }

  // For non-fabricator routes, use StandardNavbar
  return <StandardNavbar {...props} />;
};

export default ConditionalNavbar;
