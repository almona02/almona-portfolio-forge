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

  // Define the path where the industrial navbar should be displayed
  const industrialPath = '/fabricator-workflow';

  // Determine which navbar to render based on the current path
  return location.pathname === industrialPath ? 
    <IndustrialNavbar {...props} /> : 
    <StandardNavbar {...props} />;
};

export default ConditionalNavbar;
