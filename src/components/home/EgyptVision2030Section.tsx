import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const EgyptVision2030Section = () => {
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  return <section className="py-16 bg-slate-900 text-white" dir={ar ? 'rtl' : 'ltr'}>
    <div className="container mx-auto px-4 max-w-4xl space-y-5">
      <p className="text-amber-400">{ar ? 'مقترح ألمونا المستقل' : 'An independent ALMONA proposal'}</p>
      <h2 className="typography-h2">{ar ? 'استكشاف التصنيع الرقمي' : 'Exploring digital manufacturing'}</h2>
      <p className="text-slate-300">{ar ? 'نقترح تقييم مسارات العمل الرقمية والتدريب واستخدام المواد مع الورش المهتمة. لم يتم إعلان رعاية حكومية أو شراكة مؤسسية أو نتائج مقاسة.' : 'We propose evaluating digital workflows, training and material use with interested workshops. Government sponsorship, institutional partnerships and measured outcomes have not been established.'}</p>
      <Link to="/digital-egypt" className="inline-block text-amber-400 underline">{ar ? 'اقرأ المقترح' : 'Read the proposal'}</Link>
    </div>
  </section>;
};
