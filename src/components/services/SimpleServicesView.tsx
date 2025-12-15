import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { ServicePackageGrid } from './ServicePackageGrid';
import { PackageComparisonTable } from './PackageComparisonTable';
import ServiceCoverageMap from './ServiceCoverageMap';
import { CustomerStories } from './CustomerStories';
import { PackageCalculator } from './PackageCalculator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Factory, Users, Zap, CheckCircle2, Clock } from 'lucide-react';

interface SimpleServicesViewProps {
  onPackageSelect?: (packageId: string) => void;
  className?: string;
}

export const SimpleServicesView: React.FC<SimpleServicesViewProps> = ({
  onPackageSelect,
  className = ''
}) => {
  const { t, language: _language } = useLanguage();

  const stats = [
    { number: "98%", label: t('services.customer_satisfaction'), icon: <CheckCircle2 className="h-6 w-6" /> },
    { number: "24/7", label: t('services.support_availability'), icon: <Clock className="h-6 w-6" /> },
    { number: "2H", label: t('services.avg_emergency_response'), icon: <Zap className="h-6 w-6" /> },
    { number: "500+", label: t('services.machines_serviced'), icon: <Factory className="h-6 w-6" /> }
  ];

  const serviceCategories = [
    {
      id: "machine",
      name: t('services.machine_services'),
      icon: <Factory className="h-6 w-6" />,
      services: [
        t('services.installation_setup'),
        t('services.regular_maintenance'),
        t('services.emergency_repairs'),
        t('services.machine_optimization'),
        t('services.technology_upgrades')
      ]
    },
    {
      id: "training",
      name: t('services.training_programs'),
      icon: <Users className="h-6 w-6" />,
      services: [
        t('services.basic_operator_training'),
        t('services.advanced_fabrication'),
        t('services.quality_control'),
        t('services.team_leader_programs'),
        t('services.safety_certification')
      ]
    },
    {
      id: "support",
      name: t('services.support_services'),
      icon: <Zap className="h-6 w-6" />,
      services: [
        t('services.spare_parts_supply'),
        t('services.production_consulting'),
        t('services.quality_assurance'),
        t('services.export_preparation'),
        t('services.custom_solutions')
      ]
    }
  ];

  const processSteps = [
    {
      step: "1",
      title: t('services.choose_package_step'),
      description: t('services.select_perfect_service_plan')
    },
    {
      step: "2",
      title: t('services.machine_registration_step'),
      description: t('services.register_machines_digital_tracking')
    },
    {
      step: "3",
      title: t('services.service_activation_step'),
      description: t('services.dedicated_support_team_assigned')
    },
    {
      step: "4",
      title: t('services.ongoing_care_step'),
      description: t('services.regular_maintenance_twenty_four_seven')
    }
  ];

  return (
    <div className={`space-y-20 ${className}`}>

      {/* Premium Services Hero (top of page) */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-purple-500/10" />
        <div className="relative max-w-7xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              {t('services.premium_services')}
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-gray-300 mb-6 max-w-4xl mx-auto leading-relaxed"
          >
            {t('services.complete_care_solutions')}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-6 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
                <div className="flex justify-center mb-2 text-orange-400">
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stat.number}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Service Categories (moved up for quick scan before packages) */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              {t('services.complete_service_catalog')}
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              {t('services.everything_keep_fabrication_running')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {serviceCategories.map((category, index) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full bg-slate-800/50 backdrop-blur-sm border border-white/10 hover:border-orange-500/30 transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                        {category.icon}
                      </div>
                      <CardTitle className="text-xl text-white">
                        {category.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {category.services.map((service, idx) => (
                        <li key={idx} className="flex items-center space-x-3 text-gray-300">
                          <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />
                          <span>{service}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Steps (How it works) */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              {t('services.how_our_service_works')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {processSteps.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-6 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10"
              >
                <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Packages */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <ServicePackageGrid onPackageSelect={onPackageSelect} />
        </div>
      </section>

      {/* Package Comparison Table */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <PackageComparisonTable />
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <PackageCalculator onPackageRecommend={onPackageSelect} />
        </div>
      </section>

      {/* Service Coverage Map (Egypt/Turkey) */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-white">
              {t('services.regional_service_coverage')}
            </h2>
            <p className="text-xl text-gray-400">{t('services.technician_locations_response_times')}</p>
          </div>
          <ServiceCoverageMap />
        </div>
      </section>

      {/* Customer Success Stories */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <CustomerStories showFeaturedOnly={true} maxStories={3} />
        </div>
      </section>

    </div>
  );
};

export default SimpleServicesView;
