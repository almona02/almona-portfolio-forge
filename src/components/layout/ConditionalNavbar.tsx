import React from 'react';
import { useLocation } from 'react-router-dom';
import StandardNavbar from './Navbar';
import IndustrialNavbar from './IndustrialNavbar';

interface ConditionalNavbarProps {
  user?: {
    name: string;
    email: string;
    role: string;
  };
  quoteItems?: unknown[];
  onLogout?: () => void;
}

const ConditionalNavbar: React.FC<ConditionalNavbarProps> = (props) => {
  const location = useLocation();

  const pathname = location.pathname;
  const isFabricatorRoute =
    pathname.startsWith('/fabricator') || pathname.startsWith('/fabricator-workflow');

  return isFabricatorRoute ? (
    <IndustrialNavbar {...props} />
  ) : (
    <StandardNavbar {...props} />
  );
};

export default ConditionalNavbar;
