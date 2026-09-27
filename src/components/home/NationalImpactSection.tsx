import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export const NationalImpactSection = () => {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const items = ar ? [
    ['الماكينات', 'استعرض ماكينات تشغيل الألومنيوم وUPVC وناقش متطلبات ورشتك.', '/products/machines'],
    ['الصيانة', 'ناقش احتياجات الفحص والصيانة وقطع الغيار.', '/services'],
    ['التدريب', 'استفسر عن موضوعات التدريب ومواعيده وتكلفته.', '/services/training'],
    ['تواصل معنا', 'اطلب عرض سعر مكتوب يناسب الماكينة وموقع العمل.', '/contact'],
  ] : [
    ['Machinery', 'Explore aluminium and UPVC machines and discuss workshop requirements.', '/products/machines'],
    ['Maintenance', 'Discuss inspections, maintenance and spare-part needs.', '/services'],
    ['Training', 'Ask about training topics, schedules and fees.', '/services/training'],
    ['Talk to ALMONA', 'Request a written quote for your machine and site.', '/contact'],
  ];
  return <section className="py-20 bg-slate-950" dir={ar ? 'rtl' : 'ltr'}>
    <div className="container mx-auto px-4">
      <h2 className="typography-h2 text-white mb-8 text-center">{ar ? 'دعم احتياجات ورشتك' : 'Support for your workshop'}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">{items.map(([title, text, href]) =>
        <Link key={title} to={href} className="block rounded-2xl border border-amber-500/20 p-6 hover:border-amber-400">
          <h3 className="text-xl text-amber-400 mb-3">{title}</h3><p className="text-slate-300">{text}</p>
        </Link>)}</div>
    </div>
  </section>;
};
