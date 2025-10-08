import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ServicePackageGrid } from './ServicePackageGrid';
import { PackageComparisonTable } from './PackageComparisonTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Factory, Users, Zap, CheckCircle2, Clock, Shield, TrendingUp } from 'lucide-react';

interface SimpleServicesViewProps {
  onPackageSelect?: (packageId: string) => void;
  className?: string;
}

export const SimpleServicesView: React.FC<SimpleServicesViewProps> = ({
  onPackageSelect,
  className = ''
}) => {
  const { t } = useTranslation('services');

  const stats = [
    { number: "98%", label: "Customer Satisfaction", icon: <CheckCircle2 className="h-6 w-6" /> },
    { number: "24/7", label: "Support Availability", icon: <Clock className="h-6 w-6" /> },
    { number: "2H", label: "Avg. Emergency Response", icon: <Zap className="h-6 w-6" /> },
    { number: "500+", label: "Machines Serviced", icon: <Factory className="h-6 w-6" /> }
  ];

  const serviceCategories = [
    {
      id: "machine",
      name: t('categories.machine.name'),
      icon: <Factory className="h-6 w-6" />,
      services: t('categories.machine.services', { returnObjects: true }) as string[]
    },
    {
      id: "training",
      name: t('categories.training.name'),
      icon: <Users className="h-6 w-6" />,
      services: t('categories.training.services', { returnObjects: true }) as string[]
    },
    {
      id: "support",
      name: t('categories.support.name'),
      icon: <Zap className="h-6 w-6" />,
      services: t('categories.support.services', { returnObjects: true }) as string[]
    }
  ];

  const processSteps = t('process.steps', { returnObjects: true }) as Array<{
    step: string;
    title: string;
    description: string;
  }>;

  return (
    <div className={`space-y-20 ${className}`}>
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-purple-500/10" />
        <div className="relative max-w-7xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
              Premium Services
            </span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto leading-relaxed"
          >
            Complete care solutions for aluminum and UPVC fabrication machines. 
            <span className="text-orange-400"> Smart enough for big factories, simple enough for small workshops.</span>
          </motion.p>
          
          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-16"
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

      {/* Service Categories */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Complete <span className="text-orange-400">Service Catalog</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to keep your fabrication business running smoothly
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

      {/* Process Steps */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              How Our <span className="text-orange-400">Service Works</span>
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

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-3xl p-12 border border-white/10 backdrop-blur-sm"
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Transform Your <span className="text-orange-400">Fabrication Business?</span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join hundreds of satisfied aluminum and UPVC fabricators who trust ALMONA for their machine care.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl text-lg">
                Get Free Consultation
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-slate-900 px-8 py-3 rounded-xl text-lg">
                View Case Studies
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default SimpleServicesView;
