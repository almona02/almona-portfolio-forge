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

  // Define the paths where the industrial navbar should be displayed
  // We treat the entire fabricator area as an "industrial cockpit":
  // - /fabricator           → dashboard / overview
  // - /fabricator-workflow  → AI workflow cockpit (plus any sub‑paths like /pro)
  const pathname = location.pathname;
  const isFabricatorRoute =
    pathname.startsWith('/fabricator') || pathname.startsWith('/fabricator-workflow');

  // Determine which navbar to render based on the current path
  return isFabricatorRoute ? (
    <IndustrialNavbar {...props} />
  ) : (
    <StandardNavbar {...props} />
  );
};

export default ConditionalNavbar;
