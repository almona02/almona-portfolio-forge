import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Heart, Shield, Award } from 'lucide-react';

interface ServicePackageCardProps {
  packageId: 'basic' | 'professional' | 'enterprise';
  onSelect?: (packageId: string) => void;
  className?: string;
}

const packageIcons = {
  basic: <Heart className="h-8 w-8" />,
  professional: <Shield className="h-8 w-8" />,
  enterprise: <Award className="h-8 w-8" />
};

const packageColors = {
  basic: {
    gradient: 'from-green-500 to-emerald-600',
    border: 'border-green-500/30',
    bg: 'bg-green-500/10',
    text: 'text-green-400'
  },
  professional: {
    gradient: 'from-yellow-500 to-orange-600',
    border: 'border-yellow-500/30',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400'
  },
  enterprise: {
    gradient: 'from-red-500 to-pink-600',
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    text: 'text-red-400'
  }
};

export const ServicePackageCard: React.FC<ServicePackageCardProps> = ({
  packageId,
  onSelect,
  className = ''
}) => {
  const { t, language } = useLanguage();
  
  // Package data based on packageId
  const packageData = {
    basic: {
      title: t('services.basic_care_package'),
      machines: t('services.basic_care_machines'),
      price: t('services.basic_care_price'),
      features: [
        t('services.monthly_health_check'),
        t('services.basic_spare_parts'),
        t('services.phone_email_support'),
        t('services.forty_eight_hour_response'),
        t('services.two_training_sessions'),
        t('services.digital_machine_passport')
      ],
      actionText: t('services.get_started'),
      popular: false
    },
    professional: {
      title: t('services.professional_care_package'),
      machines: t('services.professional_care_machines'),
      price: t('services.professional_care_price'),
      features: [
        t('services.weekly_remote_monitoring'),
        t('services.priority_spare_parts'),
        t('services.emergency_hotline'),
        t('services.twenty_four_hour_onsite'),
        t('services.four_training_sessions'),
        t('services.production_optimization_advice'),
        t('services.advanced_machine_diagnostics')
      ],
      actionText: t('services.get_started'),
      popular: true
    },
    enterprise: {
      title: t('services.enterprise_care_package'),
      machines: t('services.enterprise_care_machines'),
      price: t('services.custom_pricing'),
      features: [
        t('services.real_time_ai_predictive'),
        t('services.dedicated_technical_team'),
        t('services.four_hour_emergency_guarantee'),
        t('services.forty_percent_spare_parts'),
        t('services.unlimited_training_sessions'),
        t('services.custom_production_reports'),
        t('services.technology_upgrade_consulting'),
        t('services.export_compliance_support')
      ],
      actionText: t('services.contact_sales'),
      popular: false
    }
  }[packageId];
  const colors = packageColors[packageId];
  const icon = packageIcons[packageId];
  const isPopular = packageData?.popular || false;

  const handleSelect = () => {
    onSelect?.(packageId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`relative ${className}`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full">
            <Star className="h-3 w-3 mr-1 fill-current" />
            {t('services.most_popular')}
          </Badge>
        </div>
      )}
      
      <Card className={`h-full border-2 ${colors.border} bg-slate-800/50 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${
        isPopular ? 'ring-2 ring-yellow-500/50' : ''
      }`}>
        <CardHeader className={`text-center pb-4 ${colors.bg} rounded-t-lg`}>
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r ${colors.gradient} flex items-center justify-center text-white`}>
            {icon}
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            {packageData?.title || packageId}
          </CardTitle>
          <CardDescription className="text-gray-300">
            {packageData?.machines || ''}
          </CardDescription>
          
          <div className="mt-4">
            <div className="text-4xl font-bold text-white">
              {packageData?.price || 'N/A'}
            </div>
            <div className="text-gray-400 text-sm">
              {language === 'ar' ? 'شهرياً' : 'per month'}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="space-y-4">
            {packageData?.features?.map((feature: string, idx: number) => (
              <div key={idx} className="flex items-start space-x-3">
                <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            className={`w-full bg-gradient-to-r ${colors.gradient} hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-all`}
            onClick={handleSelect}
          >
            {packageData?.actionText || 'Get Started'}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default ServicePackageCard;
