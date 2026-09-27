import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { useTranslation } from 'react-i18next';

const DigitalEgypt = () => {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const label = (en: string, arabic: string) => ar ? arabic : en;
  return <>
    <SEO title="ALMONA Smart Manufacturing Proposal" description="An ALMONA proposal for evaluating digital workflows in aluminium and UPVC workshops." />
    <main className="container mx-auto px-4 pt-28 pb-20 max-w-4xl text-white space-y-8" dir={ar ? 'rtl' : 'ltr'}>
      <p className="text-amber-400">{label('ALMONA proposal • Open for discussion', 'مقترح ألمونا • مفتوح للمناقشة')}</p>
      <h1 className="typography-h1">{label('Exploring digital workflows for Egyptian workshops', 'استكشاف مسارات عمل رقمية للورش المصرية')}</h1>
      <p className="text-lg text-slate-300">{label('We propose evaluating digital planning, operator training and material tracking in aluminium and UPVC workshops. Scope and feasibility would be agreed with participating workshops before any pilot begins.', 'نقترح تقييم التخطيط الرقمي وتدريب المشغلين وتتبع المواد في ورش الألومنيوم وUPVC. يتم الاتفاق على النطاق والجدوى مع الورش المشاركة قبل بدء أي تجربة.')}</p>
      <div className="border border-amber-500/30 rounded-xl p-6">
        <h2 className="text-xl mb-3">{label('Proposal status', 'حالة المقترح')}</h2>
        <p>{label('This is an independent ALMONA proposal, not an announced government programme. No government sponsorship, institutional partnership, funding, certification or measured pilot results are claimed.', 'هذا مقترح مستقل من ألمونا وليس برنامجاً حكومياً معلناً. لا ندعي وجود رعاية حكومية أو شراكة مؤسسية أو تمويل أو اعتماد أو نتائج تجريبية مقاسة.')}</p>
      </div>
      <section className="space-y-3"><h2 className="typography-h2">{label('What an evaluation would measure', 'ما الذي سيقيسه التقييم')}</h2>
        <ul className="list-disc ps-6 space-y-3">
          <li>{label('Material use and offcuts against a recorded baseline.', 'استخدام المواد والبواقي مقارنة بخط أساس مسجل.')}</li>
          <li>{label('Operator task time, training needs and quality checks.', 'وقت مهام المشغل واحتياجات التدريب وفحوص الجودة.')}</li>
          <li>{label('Machine compatibility, data requirements and implementation cost.', 'توافق الماكينات ومتطلبات البيانات وتكلفة التنفيذ.')}</li>
        </ul>
        <p className="text-slate-300">{label('Targets, methods and results would be documented for each site. Savings or productivity improvements are not guaranteed.', 'يتم توثيق الأهداف والمنهجيات والنتائج لكل موقع. لا نضمن وفورات أو تحسينات إنتاجية محددة.')}</p>
      </section>
      <Link to="/contact" className="inline-block rounded-lg bg-amber-500 text-black px-6 py-3">{label('Discuss the proposal', 'ناقش المقترح')}</Link>
    </main>
  </>;
};
export default DigitalEgypt;
