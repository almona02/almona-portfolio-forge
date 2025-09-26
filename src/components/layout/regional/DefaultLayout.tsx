/**
 * Default Regional Layout
 * Standard layout for international/default markets with enhanced region selection
 */

import React, { useState, useEffect } from 'react';
import { RegionalMarketConfig, RegionCode } from '@/config/regionalConfig';
import { RegionSelectionModal } from '@/components/ui/RegionSelectionModal';
import { Button } from '@/components/ui/button';
import { Globe, Settings, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '../Navbar';

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
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Check if this is the user's first visit
    const hasVisited = localStorage.getItem('almona_has_visited');
    if (!hasVisited) {
      setIsFirstVisit(true);
      setShowWelcome(true);
      setTimeout(() => {
        setShowWelcome(false);
        setShowRegionModal(true);
      }, 2000);
      localStorage.setItem('almona_has_visited', 'true');
    }
  }, []);

  const handleRegionChange = (region: RegionCode) => {
    onRegionChange(region);
    setShowRegionModal(false);
  };

  return (
    <div className="min-h-screen bg-almona-dark text-white">
      {/* Main Navigation */}
      <Navbar />
      
      {/* Welcome Animation */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900/90 to-purple-900/90 backdrop-blur-sm">
          <div className="text-center animate-pulse">
            <div className="relative mb-6">
              <Globe className="w-16 h-16 text-blue-400 mx-auto animate-spin" style={{ animationDuration: '2s' }} />
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-bounce" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome to Almona Forge</h2>
            <p className="text-gray-300">Setting up your personalized experience...</p>
          </div>
        </div>
      )}

      {/* Enhanced header banner */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 text-white py-3 px-4 relative overflow-hidden mt-16">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/50 via-purple-600/50 to-blue-800/50 animate-pulse" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="font-medium">International Market</span>
            </div>
            <span className="text-blue-200">•</span>
            <span className="text-blue-200">Global Shipping Available</span>
          </div>

          {enableRegionSwitching && (
            <div className="flex items-center space-x-3">
              <div className="flex space-x-2">
                <button
                  onClick={() => onRegionChange('TR')}
                  className="px-3 py-1 bg-white/20 rounded-full text-xs hover:bg-white/30 transition-all duration-200 flex items-center space-x-1"
                >
                  <span>🇹🇷</span>
                  <span>Turkey</span>
                </button>
                <button
                  onClick={() => onRegionChange('EG')}
                  className="px-3 py-1 bg-white/20 rounded-full text-xs hover:bg-white/30 transition-all duration-200 flex items-center space-x-1"
                >
                  <span>🇪🇬</span>
                  <span>Egypt</span>
                </button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRegionModal(true)}
                className="text-white hover:bg-white/20 flex items-center space-x-1"
              >
                <Settings className="w-4 h-4" />
                <span>Region</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="relative">
        {children}
      </div>

      {/* Enhanced footer */}
      <footer className="bg-gradient-to-t from-gray-900 to-gray-800 text-gray-300 py-12 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-orange-600/5 animate-pulse" />
        
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* International compliance info */}
            <div className="group">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <span>🛡️</span>
                <span>Compliance</span>
              </h3>
              <ul className="space-y-2 text-sm">
                {config.compliance.standards.map((standard, index) => (
                  <li key={index} className="flex items-center space-x-2 group-hover:text-blue-300 transition-colors">
                    <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                    <span>{standard}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* International business info */}
            <div className="group">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <span>🕒</span>
                <span>Business Hours</span>
              </h3>
              <div className="text-sm space-y-2">
                <p className="group-hover:text-green-300 transition-colors">
                  Monday - Friday: {config.business.workingHours.start} - {config.business.workingHours.end}
                </p>
                <p className="text-gray-400">{config.business.workingHours.timezone}</p>
                <p className="text-green-400 font-medium flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span>
                    {new Date().toLocaleTimeString('en-US', { 
                      timeZone: config.business.workingHours.timezone,
                      hour: '2-digit',
                      minute: '2-digit'
                    })} - Open
                  </span>
                </p>
              </div>
            </div>

            {/* International payment methods */}
            <div className="group">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                <span>💳</span>
                <span>Payment Methods</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {config.pricing.paymentMethods.map((method, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs hover:bg-blue-500/30 transition-all duration-200"
                  >
                    {method.replace('_', ' ').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Enhanced legal notice */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">
                This site operates in compliance with international standards. 
                Prices may vary by region and are subject to local taxes and regulations.
              </p>
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
                <span>© 2024 Almona Forge</span>
                <span>•</span>
                <span>All rights reserved</span>
                <span>•</span>
                <span>Made with ❤️ for global markets</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Region Selection Modal */}
      <RegionSelectionModal
        isOpen={showRegionModal}
        onRegionSelect={handleRegionChange}
        onClose={() => setShowRegionModal(false)}
        currentRegion="DEFAULT"
      />
    </div>
  );
};

export default DefaultLayout;
