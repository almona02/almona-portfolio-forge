/**
 * Egyptian Regional Layout
 * Layout optimized for Egyptian market with Arabic RTL support and local features
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import ConditionalNavbar from '../ConditionalNavbar';
import Footer from '../Footer';

interface EgyptianLayoutProps {
  children: React.ReactNode;
  config: RegionalMarketConfig;
  onRegionChange: (region: RegionCode) => void;
  enableRegionSwitching: boolean;
}

export const EgyptianLayout: React.FC<EgyptianLayoutProps> = ({
  children,
  config: _config,
  onRegionChange: _onRegionChange,
  enableRegionSwitching: _enableRegionSwitching
}) => {
  const location = useLocation();
  const isFabricatorRoute = location.pathname.startsWith('/fabricator');
  
  return (
    <div className="min-h-screen bg-almona-dark text-white" dir="rtl">
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

export default EgyptianLayout;
