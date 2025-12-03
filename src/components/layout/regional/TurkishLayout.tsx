/**
 * Turkish Regional Layout
 * Layout optimized for Turkish market with KDV calculations and local features
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import ConditionalNavbar from '../ConditionalNavbar';
import Footer from '../Footer';

interface TurkishLayoutProps {
  children: React.ReactNode;
  config: RegionalMarketConfig;
  onRegionChange: (region: RegionCode) => void;
  enableRegionSwitching: boolean;
}

export const TurkishLayout: React.FC<TurkishLayoutProps> = ({
  children,
  config: _config,
  onRegionChange: _onRegionChange,
  enableRegionSwitching: _enableRegionSwitching
}) => {
  const location = useLocation();
  const isFabricatorRoute = location.pathname.startsWith('/fabricator');
  
  return (
    <div className="min-h-screen bg-almona-dark text-white">
      {/* Main Navigation */}
      <ConditionalNavbar />
      
      {/* Main content */}
      <div className="relative">
        {children}
      </div>

      {/* Footer - Hidden for fabricator routes (they have their own minimal footer) */}
      {!isFabricatorRoute && <Footer />}
    </div>
  );
};

export default TurkishLayout;
