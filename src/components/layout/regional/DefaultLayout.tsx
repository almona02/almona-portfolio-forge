/**
 * Default Regional Layout
 * Standard layout for international/default markets with enhanced region selection
 */

import { WhatsAppContact } from '@/components/contact/WhatsAppContact';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import { isRTL } from '@/lib/i18n';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import ConditionalNavbar from '../ConditionalNavbar';
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
  const { i18n } = useTranslation();
  const location = useLocation();
  const isFabricatorRoute = location.pathname.startsWith('/fabricator') || location.pathname.startsWith('/fabricator-workflow');
  const _rtl = isRTL(i18n.language);
  
  const _handleRegionChange = (region: RegionCode) => {
    onRegionChange(region);
  };

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

      {/* WhatsApp Contact */}
      <WhatsAppContact 
        phoneNumber="+201234567890"
        businessHours="8AM - 6PM (GMT+2)"
        position="bottom-right"
      />
    </div>
  );
};

export default DefaultLayout;
