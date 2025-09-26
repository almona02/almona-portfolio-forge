/**
 * Egyptian Regional Layout
 * Layout optimized for Egyptian market with Arabic RTL support and local features
 */

import React from 'react';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';

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
      {/* Egyptian-specific header banner */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white py-2 px-4 text-center text-sm">
        <div className="flex items-center justify-center space-x-4">
          <span>🇪🇬</span>
          <span>محسن لسوق المصري</span>
          <span>•</span>
          <span>الأسعار تشمل ضريبة القيمة المضافة 14%</span>
          <span>•</span>
          <span>شحن مجاني</span>
          {enableRegionSwitching && (
            <button
              onClick={() => onRegionChange('TR')}
              className="ml-4 px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30"
            >
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
