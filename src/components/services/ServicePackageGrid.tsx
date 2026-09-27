import { useLanguage } from '@/context/LanguageContext';
import React from 'react';
import { ServicePackageCard } from './ServicePackageCard';

interface ServicePackageGridProps {
  onPackageSelect?: (packageId: string) => void;
  className?: string;
}

export const ServicePackageGrid: React.FC<ServicePackageGridProps> = ({
  onPackageSelect,
  className = ''
}) => {
  const { t } = useLanguage();
  
  const packages: Array<'basic' | 'professional' | 'enterprise'> = ['basic', 'professional', 'enterprise'];

  return (
    <div className={`space-y-12 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="typography-h2 text-4xl text-white mb-4">
          {t('services.service_packages')}
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Discuss a service scope for your aluminium or UPVC workshop. Coverage, timing and fees require a written quotation.
        </p>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {packages.map((packageId) => (
          <ServicePackageCard
            key={packageId}
            packageId={packageId}
            onSelect={onPackageSelect}
            className="animate-fade-in-up"
          />
        ))}
      </div>

    </div>
  );
};

export default ServicePackageGrid;
