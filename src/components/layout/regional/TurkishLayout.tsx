/**
 * Turkish Regional Layout
 * Layout optimized for Turkish market with KDV calculations and local features
 */

import React from 'react';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import Navbar from '../Navbar';

interface TurkishLayoutProps {
  children: React.ReactNode;
  config: RegionalMarketConfig;
  onRegionChange: (region: RegionCode) => void;
  enableRegionSwitching: boolean;
}

export const TurkishLayout: React.FC<TurkishLayoutProps> = ({
  children,
  config,
  onRegionChange,
  enableRegionSwitching
}) => {
  return (
    <div className="min-h-screen bg-almona-dark text-white">
      {/* Main Navigation */}
      <Navbar />
      
      {/* Turkish-specific header banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-3 px-4 text-center text-sm mt-16 relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/80 via-red-700/60 to-red-800/80 animate-pulse" />
        
        <div className="relative flex items-center justify-center space-x-2 sm:space-x-4 flex-wrap gap-2">
          {/* Enhanced Turkey flag icon with better resolution */}
          <div className="flex items-center space-x-2">
            <span className="text-2xl sm:text-3xl filter drop-shadow-lg" style={{ 
              textShadow: '0 0 8px rgba(255,255,255,0.3)',
              filter: 'brightness(1.1) contrast(1.1)'
            }}>🇹🇷</span>
            <span className="font-medium text-white/95">Türkiye</span>
          </div>
          
          <span className="hidden sm:inline text-white/80">•</span>
          <span className="text-white/90 font-medium">KDV %20 dahil fiyatlar</span>
          <span className="hidden sm:inline text-white/80">•</span>
          <span className="text-white/90 font-medium">Ücretsiz kargo</span>
          
          {enableRegionSwitching && (
            <button
              onClick={() => onRegionChange('EG')}
              className="ml-2 sm:ml-4 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-md text-xs font-medium transition-all duration-200 border border-white/20 hover:border-white/30"
            >
              <span className="text-lg mr-1">🇪🇬</span>
              مصر / Egypt
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="relative">
        {children}
      </div>

      {/* Turkish-specific footer enhancements */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Turkish compliance info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Uyumluluk</h3>
              <ul className="space-y-2 text-sm">
                <li>• TS EN 14351-1 Standardı</li>
                <li>• CE İşaretleme</li>
                <li>• TSE Sertifikası</li>
                <li>• ISO 9001 Kalite Yönetimi</li>
              </ul>
            </div>

            {/* Turkish business info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">İş Saatleri</h3>
              <div className="text-sm space-y-1">
                <p>Pazartesi - Cuma: {config.business.workingHours.start} - {config.business.workingHours.end}</p>
                <p>İstanbul Saati (GMT+3)</p>
                <p className="text-green-400">
                  {new Date().toLocaleTimeString('tr-TR', { 
                    timeZone: config.business.workingHours.timezone,
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {config.business.workingHours.start <= new Date().toLocaleTimeString('tr-TR', { 
                    timeZone: config.business.workingHours.timezone,
                    hour: '2-digit',
                    minute: '2-digit'
                  }) && new Date().toLocaleTimeString('tr-TR', { 
                    timeZone: config.business.workingHours.timezone,
                    hour: '2-digit',
                    minute: '2-digit'
                  }) <= config.business.workingHours.end ? 'Açık' : 'Kapalı'}
                </p>
              </div>
            </div>

            {/* Turkish payment methods */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Ödeme Yöntemleri</h3>
              <div className="flex flex-wrap gap-2">
                {config.pricing.paymentMethods.map((method, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-xs"
                  >
                    {method.replace('_', ' ').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Turkish legal notice */}
          <div className="mt-8 pt-4 border-t border-gray-700 text-xs text-gray-400 text-center">
            <p>
              Bu site Türkiye Cumhuriyeti yasalarına uygun olarak faaliyet göstermektedir. 
              Tüm fiyatlar KDV %20 dahildir.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TurkishLayout;
