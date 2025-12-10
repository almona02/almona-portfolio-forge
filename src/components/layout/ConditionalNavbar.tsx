import React from 'react';
import { useLocation } from 'react-router-dom';
import StandardNavbar from './Navbar';
import EnterpriseSidebar from './EnterpriseSidebar';

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

  return isFabricatorRoute ? (
    <EnterpriseSidebar 
      user={props.user as { name: string; email: string; role: 'operator' | 'supervisor' | 'admin' } | undefined}
      currentWorkflow={props.currentWorkflow}
      onWorkflowChange={props.onWorkflowChange}
    />
  ) : (
    <StandardNavbar {...props} />
  );
};

export default ConditionalNavbar;
