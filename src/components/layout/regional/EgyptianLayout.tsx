/**
 * Egyptian Regional Layout
 * Layout optimized for Egyptian market with Arabic RTL support and local features
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import ConditionalNavbar from '../ConditionalNavbar';
import Footer from '../Footer';
import { useTranslation } from 'react-i18next';
import { isRTL } from '@/lib/i18n';

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
  const { i18n } = useTranslation();
  const location = useLocation();
  const isFabricatorRoute = location.pathname.startsWith('/fabricator') || location.pathname.startsWith('/fabricator-workflow');
  const rtl = isRTL(i18n.language);
  
  return (
    <div className="min-h-screen bg-almona-dark text-white" dir="rtl">
      {/* Main Navigation */}
      <ConditionalNavbar />
      
      {/* Main content */}
      <div 
        className={`relative transition-all duration-300 ${isFabricatorRoute ? 'ms-[var(--sidebar-width,320px)]' : ''}`}
        style={
          isFabricatorRoute
            ? rtl
              ? { marginRight: 'var(--sidebar-width, 320px)' }
              : { marginLeft: 'var(--sidebar-width, 320px)' }
            : {}
        }
      >
        {children}
      </div>

      {/* Footer - Hidden for fabricator routes (they have their own minimal footer) */}
      {!isFabricatorRoute && <Footer />}
    </div>
  );
};

export default EgyptianLayout;
