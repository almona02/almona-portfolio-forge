/**
 * Egyptian Regional Layout
 * Layout optimized for Egyptian market with Arabic RTL support and local features
 */

import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import ConditionalNavbar from '../ConditionalNavbar';
import Footer from '../Footer';
import MarketplaceFooter from '@/components/used-machines/MarketplaceFooter';

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
  useTranslation();
  const location = useLocation();
  const isFabricatorRoute = location.pathname.startsWith('/fabricator') || location.pathname.startsWith('/fabricator-workflow');
  const isBatchCutListDemo = location.pathname === '/demo/batch-cut-list' || location.pathname === '/batch-cut-list-demo';
  const isAdminRoute = location.pathname === '/admin';
  const isMarketplaceRoute = location.pathname.startsWith('/used-machines') || location.pathname.startsWith('/usedmachines');
  
  return (
    <div className="min-h-screen bg-almona-dark text-white" dir="rtl">
      {/* Main Navigation */}
      <ConditionalNavbar />
      
      {/* Main content */}
      {/* Note: For fabricator routes, MasterLayout handles its own layout with flexbox, so no margin needed */}
      <div className="relative transition-all duration-300">
        {children}
      </div>

      {/* Footer - Hidden for fabricator routes and batch cut list demo */}
      {!isFabricatorRoute && !isBatchCutListDemo && !isAdminRoute && !isMarketplaceRoute && <Footer />}
      {isMarketplaceRoute && <MarketplaceFooter />}
    </div>
  );
};

export default EgyptianLayout;
