import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { getServicePackages, type ServicePackageId } from '@/data/servicePackages';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface PackageCalculatorProps {
  onPackageRecommend?: (packageId: string, estimatedPrice?: number) => void;
  className?: string;
}
export const PackageCalculator = ({ onPackageRecommend, className = '' }: PackageCalculatorProps) => {
  const { language } = useLanguage();
  const label = (en: string, ar: string) => language === 'ar' ? ar : en;
  const [count, setCount] = useState('3');
  const [recommendation, setRecommendation] = useState<ServicePackageId | null>(null);
  const packages = getServicePackages(language);
  const valid = Number.isSafeInteger(Number(count)) && Number(count) > 0;
  return <Card className={`bg-slate-800/50 border-white/10 text-white ${className}`}>
    <CardHeader><CardTitle>{label('Find a service plan to discuss', 'اختر خطة خدمة للمناقشة')}</CardTitle></CardHeader>
    <CardContent className="space-y-5">
      <p>{label('This guide uses your machine count to suggest a starting point. It does not calculate a price or guarantee coverage.', 'يستخدم هذا الدليل عدد ماكيناتك لاقتراح نقطة بداية، ولا يحسب سعراً أو يضمن التغطية.')}</p>
      <label htmlFor="service-machine-count">{label('Number of machines', 'عدد الماكينات')}</label>
      <Input id="service-machine-count" type="number" min="1" step="1" value={count} onChange={e => { setCount(e.target.value); setRecommendation(null); }} />
      <Button disabled={!valid} onClick={() => setRecommendation(Number(count) <= 3 ? 'basic' : Number(count) <= 10 ? 'professional' : 'enterprise')}>{label('Suggest a plan', 'اقترح خطة')}</Button>
      {recommendation && <div className="rounded-xl border border-amber-500/30 p-5 space-y-4">
        <h3 className="text-xl font-semibold">{packages[recommendation].title}</h3>
        <p>{packages[recommendation].price}</p>
        <p>{label('ALMONA will confirm machine models, site location, scope, response times and written pricing before you commit.', 'ستؤكد ألمونا طرازات الماكينات وموقع العمل والنطاق وأوقات الاستجابة والسعر كتابةً قبل التعاقد.')}</p>
        <Button onClick={() => onPackageRecommend?.(recommendation)}>{label('Discuss', 'ناقش')} {packages[recommendation].title}</Button>
      </div>}
    </CardContent>
  </Card>;
};
