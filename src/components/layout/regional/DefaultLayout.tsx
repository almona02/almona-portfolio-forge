/**
 * Default Regional Layout
 * Standard layout for international/default markets with enhanced region selection
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import ConditionalNavbar from '../ConditionalNavbar';
import Footer from '../Footer';
import { WhatsAppContact } from '@/components/contact/WhatsAppContact';
import { isRTL } from '@/lib/i18n';
import { useTranslation } from 'react-i18next';

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
  const rtl = isRTL(i18n.language);
  
  const _handleRegionChange = (region: RegionCode) => {
    onRegionChange(region);
  };

  return (
    <div className="min-h-screen bg-almona-dark text-white">
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
