export const SERVICE_PACKAGE_IDS = ['basic', 'professional', 'enterprise'] as const;
export type ServicePackageId = typeof SERVICE_PACKAGE_IDS[number];

// These scopes invite discussion; prices and service commitments require a written quote.
export function getServicePackages(language: string) {
  const label = (en: string, ar: string) => language === 'ar' ? ar : en;
  const common = {
    price: label('Contact for a quote', 'تواصل لطلب عرض سعر'),
    popular: false,
    actionText: label('Discuss this plan', 'ناقش هذه الخطة'),
  };
  return {
    basic: { ...common,
      title: label('Starter Workshop Care', 'خدمة الورش المبتدئة'),
      machines: label('For smaller workshops', 'للورش الصغيرة'),
      features: [
        label('Discuss machine inspection and maintenance needs', 'ناقش احتياجات فحص الماكينات وصيانتها'),
        label('Request spare-part compatibility checks', 'اطلب التحقق من توافق قطع الغيار'),
        label('Scope, visit schedule and price agreed in writing', 'يتم الاتفاق كتابياً على النطاق ومواعيد الزيارات والسعر'),
      ],
    },
    professional: { ...common,
      title: label('Growth Factory Care', 'خدمة المصانع النامية'),
      machines: label('For workshops with multiple production lines', 'للورش ذات خطوط الإنتاج المتعددة'),
      features: [
        label('Discuss preventive maintenance planning', 'ناقش تخطيط الصيانة الوقائية'),
        label('Request spare-part and operator training options', 'اطلب خيارات قطع الغيار وتدريب المشغلين'),
        label('Response times and coverage confirmed in your quote', 'يتم تأكيد أوقات الاستجابة والتغطية في عرض السعر'),
      ],
    },
    enterprise: { ...common,
      title: label('Enterprise Plant Care', 'خدمة المصانع الكبرى'),
      machines: label('For larger or multi-site operations', 'للعمليات الكبيرة أو متعددة المواقع'),
      features: [
        label('Discuss a site-specific service scope', 'ناقش نطاق خدمة يناسب موقعك'),
        label('Request maintenance and training coordination', 'اطلب تنسيق الصيانة والتدريب'),
        label('Availability, reporting and commercial terms agreed in writing', 'يتم الاتفاق كتابياً على التوافر والتقارير والشروط التجارية'),
      ],
    },
  };
}
