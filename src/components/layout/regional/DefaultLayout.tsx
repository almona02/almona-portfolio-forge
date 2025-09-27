/**
 * Default Regional Layout
 * Standard layout for international/default markets with enhanced region selection
 */

import React from 'react';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import Navbar from '../Navbar';
import Footer from '../Footer';

interface DefaultLayoutProps {
  children: React.ReactNode;
  config: RegionalMarketConfig;
  onRegionChange: (region: RegionCode) => void;
  enableRegionSwitching: boolean;
}

export const DefaultLayout: React.FC<DefaultLayoutProps> = ({
  children,
  config: _config,
  onRegionChange,
  enableRegionSwitching: _enableRegionSwitching
}) => {
  const _handleRegionChange = (region: RegionCode) => {
    onRegionChange(region);
  };

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

export default DefaultLayout;
