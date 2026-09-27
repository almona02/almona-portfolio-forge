import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';
import { getServicePackages, SERVICE_PACKAGE_IDS } from '@/data/servicePackages';

export function PackageComparisonTable({ className = '' }: { className?: string }) {
  const { t, language } = useLanguage();
  const packages = getServicePackages(language);
  return (
    <Card className={`bg-slate-800/50 border border-white/10 overflow-hidden ${className}`}>
      <CardHeader>
        <CardTitle className="text-white text-center">{t('services.service_package_comparison')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto" role="region" aria-label={t('services.service_package_comparison')} tabIndex={0}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {SERVICE_PACKAGE_IDS.map(id => (
                  <th key={id} scope="col" className="p-4 text-start min-w-[240px] align-top">
                    <div className="font-bold text-white">{packages[id].title}</div>
                    <div className="text-sm text-gray-300 mt-2">{packages[id].machines}</div>
                    <div className="text-lg text-amber-400 mt-2">{packages[id].price}</div>
                    {packages[id].popular && <Badge className="mt-2">{t('services.most_popular')}</Badge>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {SERVICE_PACKAGE_IDS.map(id => (
                  <td key={id} className="p-4 align-top text-sm text-gray-300">
                    <ul className="list-disc ps-4 space-y-3">
                      {packages[id].features.map(feature => <li key={feature}>{feature}</li>)}
                    </ul>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default PackageComparisonTable;
