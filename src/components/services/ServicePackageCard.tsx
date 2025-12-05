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

  const isArabic = language === 'ar';
  const label = (en: string, ar: string) => (isArabic ? ar : en);
  
  // Package data based on packageId
  const packageData = {
    basic: {
      title: label('Starter Workshop Care', 'خدمة الورش المبتدئة'),
      machines: label('1-3 machines · Cairo & Giza', '١-٣ ماكينات · القاهرة والجيزة'),
      price: label('3,200 EGP / month', '٣٬٢٠٠ جم / شهر'),
      features: [
        label('Quarterly on-site health check (Cairo/Giza 48h)', 'زيارة فحص ربع سنوية (القاهرة/الجيزة خلال ٤٨ ساعة)'),
        label('10% discount on core aluminium & UPVC spares', 'خصم ١٠٪ على قطع الغيار الأساسية للألومنيوم و UPVC'),
        label('Phone/WhatsApp support in Arabic & English', 'دعم هاتف/واتساب بالعربية والإنجليزية'),
        label('Calibration for common UPVC & aluminium cuts', 'معايرة للقصات الشائعة للألومنيوم و UPVC'),
        label('Digital machine passport and service history', 'جواز صيانة رقمي وسجل زيارات')
      ],
      actionText: label('Start with Starter', 'ابدأ بالخدمة الأساسية'),
      popular: false
    },
    professional: {
      title: label('Growth Factory Care', 'خدمة المصانع النامية'),
      machines: label('4-10 machines · Multi-line', '٤-١٠ ماكينات · خطوط متعددة'),
      price: label('7,200 EGP / month', '٧٬٢٠٠ جم / شهر'),
      features: [
        label('Monthly on-site preventive maintenance (24h Cairo/Giza, 48h Delta)', 'صيانة وقائية شهرية (٢٤ ساعة القاهرة/الجيزة، ٤٨ ساعة الدلتا)'),
        label('Priority spares with 20% discount & local stock check', 'أولوية في قطع الغيار مع خصم ٢٠٪ ومخزون محلي'),
        label('Operator refresh training twice a year', 'تدريب تحديث للمشغلين مرتين سنوياً'),
        label('Remote diagnostics & firmware updates', 'تشخيصات عن بعد وتحديثات للبرمجيات'),
        label('Production tuning for aluminium & UPVC lines', 'ضبط الإنتاج لخطوط الألومنيوم و UPVC'),
        label('Emergency hotline in Arabic/English', 'خط طوارئ بالعربية والإنجليزية')
      ],
      actionText: label('Choose Growth Care', 'اختر خدمة النمو'),
      popular: true
    },
    enterprise: {
      title: label('Enterprise Plant Care', 'خدمة المصانع الكبرى'),
      machines: label('10+ machines · Multi-site Egypt', '١٠+ ماكينات · مواقع متعددة داخل مصر'),
      price: label('14,500 EGP+ / month', '١٤٬٥٠٠ جم+ / شهر'),
      features: [
        label('4h emergency response Cairo/Giza, 8h nationwide', '٤ ساعات طوارئ القاهرة/الجيزة، ٨ ساعات لباقي المحافظات'),
        label('Dedicated customer success engineer & quarterly QBR', 'مهندس مخصص ولقاء مراجعة ربع سنوي'),
        label('Predictive maintenance with sensor insights', 'صيانة تنبؤية بتحليل الحساسات'),
        label('30% discount on strategic spares & stocking plans', 'خصم ٣٠٪ على القطع الإستراتيجية وخطط التخزين'),
        label('Unlimited operator trainings & safety refreshers', 'تدريبات غير محدودة للمشغلين وتحديثات السلامة'),
        label('Line balancing & throughput optimization for aluminium/UPVC', 'موازنة الخطوط وتحسين الإنتاج للألومنيوم و UPVC'),
        label('Compliance-ready reporting for exports and audits', 'تقارير جاهزة للتدقيق والتصدير')
      ],
      actionText: label('Talk to Enterprise', 'تواصل مع فريق المؤسسات'),
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
          <Badge variant="custom" className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-full shadow-lg shadow-orange-500/40 border border-white/10 inline-flex items-center">
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
