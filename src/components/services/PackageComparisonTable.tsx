import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';

interface PackageComparisonTableProps {
  className?: string;
}

export const PackageComparisonTable: React.FC<PackageComparisonTableProps> = ({
  className = ''
}) => {
  const { t, language } = useLanguage();

  const packages = ['basic', 'professional', 'enterprise'] as const;
  
  const features = [
    {
      category: t('services.core_services'),
      items: [
        { key: 'health_check', basic: true, professional: true, enterprise: true },
        { key: 'spare_parts_discount', basic: '15%', professional: '25%', enterprise: '40%' },
        { key: 'response_time', basic: '48h', professional: '24h', enterprise: '4h' },
        { key: 'support_hours', basic: '8AM-6PM', professional: '24/7', enterprise: '24/7' }
      ]
    },
    {
      category: t('services.advanced_features'),
      items: [
        { key: 'remote_monitoring', basic: false, professional: true, enterprise: true },
        { key: 'ai_predictive', basic: false, professional: false, enterprise: true },
        { key: 'dedicated_team', basic: false, professional: false, enterprise: true },
        { key: 'custom_reports', basic: false, professional: false, enterprise: true }
      ]
    },
    {
      category: t('services.training_support'),
      items: [
        { key: 'training_sessions', basic: '2/year', professional: '4/year', enterprise: 'Unlimited' },
        { key: 'operator_training', basic: true, professional: true, enterprise: true },
        { key: 'production_optimization', basic: false, professional: true, enterprise: true },
        { key: 'export_support', basic: false, professional: false, enterprise: true }
      ]
    }
  ];

  const getFeatureValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-green-400" />
      ) : (
        <X className="h-5 w-5 text-gray-500" />
      );
    }
    return <span className="text-sm text-gray-300">{value}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-8 ${className}`}
    >
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">
          {t('services.compare_service_packages')}
        </h3>
        <p className="text-gray-400">
          {t('services.choose_perfect_plan')}
        </p>
      </div>

      <Card className="bg-slate-800/50 backdrop-blur-sm border border-white/10 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-700/50 to-slate-800/50">
          <CardTitle className="text-white text-center">
            {t('services.service_package_comparison')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-300 font-medium">{t('services.features')}</th>
                  {packages.map((pkg) => {
                    const packageData = {
                      basic: {
                        name: t('services.basic_care_package'),
                        machines: t('services.basic_care_machines'),
                        price: t('services.basic_care_price'),
                        popular: false
                      },
                      professional: {
                        name: t('services.professional_care_package'),
                        machines: t('services.professional_care_machines'),
                        price: t('services.professional_care_price'),
                        popular: true
                      },
                      enterprise: {
                        name: t('services.enterprise_care_package'),
                        machines: t('services.enterprise_care_machines'),
                        price: t('services.custom_pricing'),
                        popular: false
                      }
                    }[pkg];
                    return (
                      <th key={pkg} className="text-center p-4 min-w-[200px]">
                        <div className="space-y-2">
                          <div className="font-bold text-white">{packageData?.name}</div>
                          <div className="text-sm text-gray-400">{packageData?.machines}</div>
                          <div className="text-lg font-bold text-orange-400">
                            {packageData?.price}
                          </div>
                          {packageData?.popular && (
                            <Badge className="bg-yellow-500 text-white text-xs">
                              {t('services.most_popular')}
                            </Badge>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {features.map((category, categoryIndex) => (
                  <React.Fragment key={categoryIndex}>
                    <tr className="border-b border-white/5">
                      <td colSpan={4} className="p-3 bg-slate-700/30">
                        <div className="font-semibold text-orange-400 text-sm uppercase tracking-wide">
                          {category.category}
                        </div>
                      </td>
                    </tr>
                    {category.items.map((item, itemIndex) => (
                      <tr key={itemIndex} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 text-gray-300 text-sm">
                          {t(`features.${item.key}`, { defaultValue: item.key.replace(/_/g, ' ') })}
                        </td>
                        <td className="p-4 text-center">
                          {getFeatureValue(item.basic)}
                        </td>
                        <td className="p-4 text-center">
                          {getFeatureValue(item.professional)}
                        </td>
                        <td className="p-4 text-center">
                          {getFeatureValue(item.enterprise)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PackageComparisonTable;
