/**
 * Region-Aware Layout Component
 * Provides region-specific layout and component loading based on detected region
 */

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PageLoadingWrapper } from '@/components/ui/PageLoadingWrapper';
import { RegionCode, RegionalMarketConfig } from '@/config/regionalConfig';
import { useRegionDetection, useRegionalConfig } from '@/hooks/useRegionDetection';
import React, { Suspense, lazy } from 'react';

// Lazy load region-specific components
const TurkishLayout = lazy(() => import('./regional/TurkishLayout'));
const EgyptianLayout = lazy(() => import('./regional/EgyptianLayout'));
const DefaultLayout = lazy(() => import('./regional/DefaultLayout'));

// Region-specific feature components
const TurkishTaxCalculator = lazy(() => import('@/components/regional/turkish/TurkishTaxCalculator'));
const EgyptianComplianceDocs = lazy(() => import('@/components/regional/egyptian/EgyptianComplianceDocs'));
const TurkishChatSupport = lazy(() => import('@/components/regional/turkish/TurkishChatSupport'));
const EgyptianChatSupport = lazy(() => import('@/components/regional/egyptian/EgyptianChatSupport'));

interface RegionAwareLayoutProps {
  children: React.ReactNode;
  showRegionalFeatures?: boolean;
  enableRegionSwitching?: boolean;
  onRegionChange?: (region: RegionCode) => void;
}

export const RegionAwareLayout: React.FC<RegionAwareLayoutProps> = ({
  children,
  showRegionalFeatures = true,
  enableRegionSwitching = true,
  onRegionChange
}) => {
  const { regionState, setRegion } = useRegionDetection();
  const { config, isLoading, error } = useRegionalConfig();
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);

  // Add a timeout to prevent infinite loading
  React.useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 3000); // 3 second timeout

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  if (isLoading && !loadingTimeout) {
    return <PageLoadingWrapper>{children}</PageLoadingWrapper>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-almona-dark text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Region Detection Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const handleRegionChange = (newRegion: RegionCode) => {
    setRegion(newRegion);
    onRegionChange?.(newRegion);
  };

  // Render region-specific layout
  const renderRegionalLayout = () => {
    switch (regionState.region) {
      case 'TR':
        return (
          <TurkishLayout
            config={config}
            onRegionChange={handleRegionChange}
            enableRegionSwitching={enableRegionSwitching}
          >
            {children}
          </TurkishLayout>
        );
      case 'EG':
        return (
          <EgyptianLayout
            config={config}
            onRegionChange={handleRegionChange}
            enableRegionSwitching={enableRegionSwitching}
          >
            {children}
          </EgyptianLayout>
        );
      default:
        return (
          <DefaultLayout
            config={config}
            onRegionChange={handleRegionChange}
            enableRegionSwitching={enableRegionSwitching}
          >
            {children}
          </DefaultLayout>
        );
    }
  };

  return (
    <ErrorBoundary>
      <div className={`min-h-screen ${config.features.rtl ? 'rtl' : 'ltr'}`}>
        {/* Region-specific layout */}
        <Suspense fallback={<PageLoadingWrapper>{children}</PageLoadingWrapper>}>
          {renderRegionalLayout()}
        </Suspense>

        {/* Regional features overlay - disabled */}
        {false && showRegionalFeatures && (
          <Suspense fallback={null}>
            <RegionalFeaturesOverlay region={regionState.region} config={config} />
          </Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
};

/**
 * Regional Features Overlay Component
 * Shows region-specific features like tax calculators, compliance docs, etc.
 */
interface RegionalFeaturesOverlayProps {
  region: RegionCode;
  config: RegionalMarketConfig;
}

const RegionalFeaturesOverlay: React.FC<RegionalFeaturesOverlayProps> = ({ region, config }) => {
  const [showFeatures, setShowFeatures] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(true);
  const [autoHideTimer, setAutoHideTimer] = React.useState<NodeJS.Timeout | null>(null);

  // Auto-hide the icon after 5 seconds
  React.useEffect(() => {
    if (isVisible && !showFeatures) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000); // Hide after 5 seconds
      setAutoHideTimer(timer);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isVisible, showFeatures]);

  // Show icon on mouse movement
  React.useEffect(() => {
    const handleMouseMove = () => {
      if (!isVisible) {
        setIsVisible(true);
      }
      // Reset auto-hide timer
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }
      if (!showFeatures) {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, 5000);
        setAutoHideTimer(timer);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      const timer = autoHideTimer;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isVisible, showFeatures, autoHideTimer]);

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFeatures) {
        setShowFeatures(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showFeatures]);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showFeatures) {
        const target = e.target as Element;
        if (!target.closest('.regional-features-overlay')) {
          setShowFeatures(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFeatures]);

  if (!isVisible) {
    return null;
  }

  if (!showFeatures) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowFeatures(true)}
          className="bg-orange-500 text-white p-3 rounded-full shadow-lg hover:bg-orange-600 transition-all duration-300 transform hover:scale-110"
          title="Regional Features"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="regional-features-overlay fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-sm border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Regional Features ({region})
        </h3>
        <button
          onClick={() => setShowFeatures(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {/* Turkish-specific features */}
        {region === 'TR' && (
          <>
            {config.features.pricingCalculator && (
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <TurkishTaxCalculator />
              </div>
            )}
            {config.business.contactMethods.support.chat && (
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <TurkishChatSupport />
              </div>
            )}
          </>
        )}

        {/* Egyptian-specific features */}
        {region === 'EG' && (
          <>
            {config.compliance.documentation.templates.length > 0 && (
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                <EgyptianComplianceDocs />
              </div>
            )}
            {config.business.contactMethods.support.chat && (
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <EgyptianChatSupport />
              </div>
            )}
          </>
        )}

        {/* Common features */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>Currency: {config.currency.symbol} {config.currency.code}</p>
          <p>Language: {config.language}</p>
          <p>Tax Rate: {config.tax.vatRate * 100}%</p>
        </div>
      </div>
    </div>
  );
};

export default RegionAwareLayout;
