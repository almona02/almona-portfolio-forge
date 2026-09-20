import { Link } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import { ServicePackageGrid } from './ServicePackageGrid';
import { PackageComparisonTable } from './PackageComparisonTable';
import { PackageCalculator } from './PackageCalculator';

interface SimpleServicesViewProps {
  onPackageSelect?: (packageId: string) => void;
  className?: string;
}
export const SimpleServicesView = ({ onPackageSelect, className = '' }: SimpleServicesViewProps) => {
  const { language } = useLanguage();
  const label = (en: string, ar: string) => language === 'ar' ? ar : en;
  return <div className={`space-y-12 ${className}`}>
    <header className="text-center py-12 space-y-5">
      <h1 className="typography-h1 text-amber-400">{label('Machine service and workshop support', 'خدمة الماكينات ودعم الورش')}</h1>
      <p className="text-lg text-gray-300 max-w-3xl mx-auto">{label('Discuss maintenance, spare parts and operator training with ALMONA. We confirm scope, availability, visit schedules and fees in a written quotation.', 'ناقش الصيانة وقطع الغيار وتدريب المشغلين مع ألمونا. نؤكد النطاق والتوافر ومواعيد الزيارات والرسوم في عرض سعر مكتوب.')}</p>
      <Link to="/contact" className="inline-block rounded-lg bg-amber-500 px-6 py-3 text-black">{label('Contact the service team', 'تواصل مع فريق الخدمة')}</Link>
    </header>
    <ServicePackageGrid onPackageSelect={onPackageSelect} />
    <PackageComparisonTable />
    <PackageCalculator onPackageRecommend={onPackageSelect} />
    <p className="text-gray-300 text-center">{label('Plans are starting points for discussion. No response-time guarantee, discount, savings estimate or subscription price applies until agreed in writing.', 'الخطط نقطة بداية للمناقشة. لا يسري ضمان وقت استجابة أو خصم أو تقدير توفير أو سعر اشتراك إلا بعد الاتفاق عليه كتابةً.')}</p>
    <div className="flex flex-wrap justify-center gap-6">
      <Link to="/services/training" className="text-amber-400 underline">{label('Training enquiries', 'استفسارات التدريب')}</Link>
      <Link to="/contact" className="text-amber-400 underline">{label('Spare-part enquiries', 'استفسارات قطع الغيار')}</Link>
    </div>
  </div>;
};
