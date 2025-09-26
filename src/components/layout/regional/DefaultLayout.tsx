/**
 * Default Regional Layout
 * Standard layout for international/default markets
 */

import React from 'react';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';

interface DefaultLayoutProps {
  children: React.ReactNode;
  config: RegionalMarketConfig;
  onRegionChange: (region: RegionCode) => void;
  enableRegionSwitching: boolean;
}

export const DefaultLayout: React.FC<DefaultLayoutProps> = ({
  children,
  config,
  onRegionChange,
  enableRegionSwitching
}) => {
  return (
    <div className="min-h-screen bg-almona-dark text-white">
      {/* Default header banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-2 px-4 text-center text-sm">
        <div className="flex items-center justify-center space-x-4">
          <span>🌍</span>
          <span>International Market</span>
          <span>•</span>
          <span>Global Shipping Available</span>
          {enableRegionSwitching && (
            <div className="ml-4 flex space-x-2">
              <button
                onClick={() => onRegionChange('TR')}
                className="px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30"
              >
                🇹🇷 Turkey
              </button>
              <button
                onClick={() => onRegionChange('EG')}
                className="px-2 py-1 bg-white/20 rounded text-xs hover:bg-white/30"
              >
                🇪🇬 Egypt
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="relative">
        {children}
      </div>

      {/* Default footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* International compliance info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Compliance</h3>
              <ul className="space-y-2 text-sm">
                <li>• CE Marking</li>
                <li>• ISO 9001 Quality Management</li>
                <li>• International Standards</li>
              </ul>
            </div>

            {/* International business info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Business Hours</h3>
              <div className="text-sm space-y-1">
                <p>Monday - Friday: {config.business.workingHours.start} - {config.business.workingHours.end}</p>
                <p>UTC Time</p>
                <p className="text-green-400">
                  {new Date().toLocaleTimeString('en-US', { 
                    timeZone: config.business.workingHours.timezone,
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {config.business.workingHours.start <= new Date().toLocaleTimeString('en-US', { 
                    timeZone: config.business.workingHours.timezone,
                    hour: '2-digit',
                    minute: '2-digit'
                  }) && new Date().toLocaleTimeString('en-US', { 
                    timeZone: config.business.workingHours.timezone,
                    hour: '2-digit',
                    minute: '2-digit'
                  }) <= config.business.workingHours.end ? 'Open' : 'Closed'}
                </p>
              </div>
            </div>

            {/* International payment methods */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Payment Methods</h3>
              <div className="flex flex-wrap gap-2">
                {config.pricing.paymentMethods.map((method, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs"
                  >
                    {method.replace('_', ' ').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* International legal notice */}
          <div className="mt-8 pt-4 border-t border-gray-700 text-xs text-gray-400 text-center">
            <p>
              This site operates in compliance with international standards. 
              Prices may vary by region and are subject to local taxes and regulations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DefaultLayout;
