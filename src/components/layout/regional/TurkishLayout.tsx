/**
 * Turkish Regional Layout
 * Layout optimized for Turkish market with KDV calculations and local features
 */

import React from 'react';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import Navbar from '../Navbar';
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
  return (
    <div className="min-h-screen bg-almona-dark text-white">
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

export default TurkishLayout;
