import React from 'react';
import { useTranslation } from 'react-i18next';
import { ServicePackageCard } from './ServicePackageCard';

interface ServicePackageGridProps {
  onPackageSelect?: (packageId: string) => void;
  className?: string;
}

export const ServicePackageGrid: React.FC<ServicePackageGridProps> = ({
  onPackageSelect,
  className = ''
}) => {
  const { t } = useTranslation('services');
  
  const packages: Array<'basic' | 'professional' | 'enterprise'> = ['basic', 'professional', 'enterprise'];

  return (
    <div className={`space-y-12 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-4xl font-bold text-white mb-4">
          {t('packages.title')}
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          {t('packages.subtitle')}
        </p>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {packages.map((packageId, index) => (
          <ServicePackageCard
            key={packageId}
            packageId={packageId}
            onSelect={onPackageSelect}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 0.1}s` }}
          />
        ))}
      </div>

      {/* Trust Indicators */}
      <div className="text-center mt-16 p-8 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-gray-300">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <span className="text-lg">SLA Guarantee</span>
          </div>
          <div className="flex items-center justify-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">24</span>
            </div>
            <span className="text-lg">24/7 Support</span>
          </div>
          <div className="flex items-center justify-center space-x-3">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">📊</span>
            </div>
            <span className="text-lg">Performance Tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePackageGrid;
