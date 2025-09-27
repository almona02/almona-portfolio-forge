/**
 * Egyptian Regional Layout
 * Layout optimized for Egyptian market with Arabic RTL support and local features
 */

import React from 'react';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import Navbar from '../Navbar';
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
  return (
    <div className="min-h-screen bg-almona-dark text-white" dir="rtl">
      {/* Main Navigation */}
      <Navbar />
      
      {/* Main content */}
      <div className="relative">
        {children}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default EgyptianLayout;
