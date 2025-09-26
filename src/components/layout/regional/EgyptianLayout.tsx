/**
 * Egyptian Regional Layout
 * Layout optimized for Egyptian market with Arabic RTL support and local features
 */

import React from 'react';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import Navbar from '../Navbar';

interface EgyptianLayoutProps {
  children: React.ReactNode;
  config: RegionalMarketConfig;
  onRegionChange: (region: RegionCode) => void;
  enableRegionSwitching: boolean;
}

export const EgyptianLayout: React.FC<EgyptianLayoutProps> = ({
  children,
  config,
  onRegionChange,
  enableRegionSwitching
}) => {
  return (
    <div className="min-h-screen bg-almona-dark text-white" dir="rtl">
      {/* Main Navigation */}
      <Navbar />
      
      {/* Egyptian-specific header banner */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white py-3 px-4 text-center text-sm mt-16 relative overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/80 via-green-700/60 to-green-800/80 animate-pulse" />
        
        <div className="relative flex items-center justify-center space-x-2 sm:space-x-4 flex-wrap gap-2">
          {/* Enhanced Egypt flag icon with better resolution */}
          <div className="flex items-center space-x-2">
            <span className="text-2xl sm:text-3xl filter drop-shadow-lg" style={{ 
              textShadow: '0 0 8px rgba(255,255,255,0.3)',
              filter: 'brightness(1.1) contrast(1.1)'
            }}>🇪🇬</span>
            <span className="font-medium text-white/95">مصر</span>
          </div>
          
          <span className="hidden sm:inline text-white/80">•</span>
          <span className="text-white/90 font-medium">الأسعار تشمل ضريبة القيمة المضافة 14%</span>
          <span className="hidden sm:inline text-white/80">•</span>
          <span className="text-white/90 font-medium">شحن مجاني</span>
          
          {enableRegionSwitching && (
            <button
              onClick={() => onRegionChange('TR')}
              className="ml-2 sm:ml-4 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-md text-xs font-medium transition-all duration-200 border border-white/20 hover:border-white/30"
            >
              <span className="text-lg mr-1">🇹🇷</span>
              Türkiye / Turkey
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="relative">
        {children}
      </div>

      {/* Egyptian-specific footer enhancements */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Egyptian compliance info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">الامتثال</h3>
              <ul className="space-y-2 text-sm">
                <li>• معيار ES 1109</li>
                <li>• علامة CE</li>
                <li>• شهادة ES</li>
                <li>• إدارة الجودة ISO 9001</li>
              </ul>
            </div>

            {/* Egyptian business info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">ساعات العمل</h3>
              <div className="text-sm space-y-1">
                <p>الأحد - السبت: {config.business.workingHours.start} - {config.business.workingHours.end}</p>
                <p>توقيت القاهرة (GMT+2)</p>
                <p className="text-green-400">
                  {new Date().toLocaleTimeString('ar-EG', { 
                    timeZone: config.business.workingHours.timezone,
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {config.business.workingHours.start <= new Date().toLocaleTimeString('ar-EG', { 
                    timeZone: config.business.workingHours.timezone,
                    hour: '2-digit',
                    minute: '2-digit'
                  }) && new Date().toLocaleTimeString('ar-EG', { 
                    timeZone: config.business.workingHours.timezone,
                    hour: '2-digit',
                    minute: '2-digit'
                  }) <= config.business.workingHours.end ? 'مفتوح' : 'مغلق'}
                </p>
              </div>
            </div>

            {/* Egyptian payment methods */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">طرق الدفع</h3>
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

          {/* Egyptian legal notice */}
          <div className="mt-8 pt-4 border-t border-gray-700 text-xs text-gray-400 text-center">
            <p>
              يعمل هذا الموقع وفقاً لقوانين جمهورية مصر العربية. 
              جميع الأسعار تشمل ضريبة القيمة المضافة 14%.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EgyptianLayout;
