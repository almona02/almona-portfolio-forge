/**
 * Turkish Regional Layout
 * Layout optimized for Turkish market with KDV calculations and local features
 */

import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import { isRTL } from '@/lib/i18n';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
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
  const { i18n } = useTranslation();
  const location = useLocation();
  const isFabricatorRoute = location.pathname.startsWith('/fabricator') || location.pathname.startsWith('/fabricator-workflow');
  const _rtl = isRTL(i18n.language);
  
  return (
    <div className="min-h-screen bg-almona-dark text-white">
      {/* Main Navigation */}
      <ConditionalNavbar />
      
      {/* Main content */}
      {/* Note: For fabricator routes, MasterLayout handles its own layout with flexbox, so no margin needed */}
      <div className="relative transition-all duration-300">
        {children}
      </div>

      {/* Footer - Hidden for fabricator routes (they have their own minimal footer) */}
      {!isFabricatorRoute && <Footer />}
    </div>
  );
};

export default TurkishLayout;
