/**
 * Default Regional Layout
 * Standard layout for international/default markets with enhanced region selection
 */

import { WhatsAppContact } from '@/components/contact/WhatsAppContact';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import React from 'react';
import { useLocation } from 'react-router-dom';
import ConditionalNavbar from '../ConditionalNavbar';
import Footer from '../Footer';
import MarketplaceFooter from '@/components/used-machines/MarketplaceFooter';

interface DefaultLayoutProps {
  children: React.ReactNode;
  config: RegionalMarketConfig;
  onRegionChange: (region: RegionCode) => void;
  enableRegionSwitching: boolean;
}

export const DefaultLayout: React.FC<DefaultLayoutProps> = ({
  children,
  config: _config,
  onRegionChange: _onRegionChange,
  enableRegionSwitching: _enableRegionSwitching
}) => {
  const location = useLocation();
  const isFabricatorRoute = location.pathname.startsWith('/fabricator') || location.pathname.startsWith('/fabricator-workflow');
  const isBatchCutListDemo = location.pathname === '/demo/batch-cut-list' || location.pathname === '/batch-cut-list-demo';
  const isAdminRoute = location.pathname === '/admin';
  const isMarketplaceRoute = location.pathname.startsWith('/used-machines') || location.pathname.startsWith('/usedmachines');

  return (
    <div className="min-h-screen bg-almona-dark text-white">
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

      {/* WhatsApp Contact - hidden on the neutral marketplace */}
      {!isMarketplaceRoute && (
        <WhatsAppContact 
          phoneNumber="+201000355135"
          businessHours="8AM - 6PM (GMT+2)"
          position="bottom-right"
        />
      )}
    </div>
  );
};

export default DefaultLayout;
