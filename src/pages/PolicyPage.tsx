import { usePublicCopy } from '@/hooks/usePublicCopy';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const policies = {
  privacy: {
    title: 'Privacy Notice',
    sections: [
      ['Who operates this website', 'This website presents ALMONA Co. and its machinery, training and support services. Contact: almona02@yahoo.com; +20 100 309 7177; 13B/18 Tarik Ibn Ziad Street, Taawen, Haram, Giza, Egypt.'],
      ['Information you provide', 'Enquiries may include your name, email address, phone number, company and message. Training requests also include the selected programme, material, preferred cohort and notes. Account and support features may request further information shown in their forms.'],
      ['Contact and quote drafts', 'The contact and quote pages prepare a draft in your browser. Preparing a draft does not send an enquiry. If you open and send that draft using your email app, your email provider and ALMONA’s email provider process the message. Training enrolment is a separate form that submits information to the website’s database.'],
      ['Purposes and service providers', 'Information is used to respond to enquiries, prepare quotations, arrange training and provide requested account or support services. The website uses Vercel for hosting and Supabase for account and database functions. Embedded services, such as 3D viewers, and external links may involve other providers. The approved notice must identify the active providers, processing locations and applicable legal basis for each purpose.'],
      ['Browser storage and analytics', 'The application uses browser storage for features including sign-in sessions, preferences and experiment assignments. It includes analytics integrations whose activation depends on deployment settings. The final notice must describe the enabled tools, information collected and available choices.'],
      ['Retention, transfers and your requests', 'ALMONA must confirm retention periods, deletion procedures, processing locations and any international-transfer arrangements before this notice is final. For questions or requests concerning your information, contact almona02@yahoo.com. The final notice must explain applicable rights, identity verification, response procedures and complaint options.'],
    ],
    pending: 'Confirm the full legal entity and privacy contact, lawful bases, active analytics and embedded providers, retention periods, hosting locations, transfer arrangements and the procedure for handling privacy requests.',
  },
  terms: {
    title: 'Website Terms',
    sections: [
      ['About ALMONA', 'This website provides information about machinery, spare parts, training and support from ALMONA Co. You can contact the team at almona02@yahoo.com or +20 100 309 7177.'],
      ['Product information and enquiries', 'Catalogue information helps you identify equipment and request details. Confirm specifications, compatibility, availability, price, taxes, delivery, installation and warranty with ALMONA before placing an order. Published estimates and a prepared email draft do not by themselves confirm an order or reserve stock.'],
      ['Quotations and service arrangements', 'A quotation or service agreement should set out the agreed equipment or scope, price, payment schedule, delivery terms, warranty and applicable cancellation or return arrangements. Those arrangements must be confirmed directly with ALMONA. This draft does not establish a new return, refund or warranty policy.'],
      ['Training requests', 'Submitting a training enquiry does not confirm a place or payment. Programme availability, dates, fees, attendance requirements and cancellation arrangements must be confirmed by ALMONA.'],
      ['Accounts and responsible use', 'Provide accurate information, protect your sign-in details and use the site lawfully. Do not attempt unauthorised access, interfere with the service or submit information you are not entitled to share.'],
      ['Technical information and third parties', 'Machine information and interactive previews do not replace the manufacturer’s operating instructions, training or safety procedures. Third-party websites and embedded services have their own terms. These draft website terms do not cover Fabricator Pro’s production workflows.'],
      ['Questions and applicable rights', 'Contact ALMONA to resolve questions about an enquiry or service. Final terms must identify the legal contracting entity and applicable dispute arrangements. Nothing in this draft is intended to exclude rights that cannot lawfully be excluded.'],
    ],
    pending: 'Confirm the legal contracting entity, sales and payment process, delivery terms, warranties, returns and cancellations, training policy and applicable dispute arrangements.',
  },
};

export default function PolicyPage({ kind }: { kind: keyof typeof policies }) {
  const copy = usePublicCopy();
  const policy = policies[kind];
  return (
    <main className="pt-24 pb-16 px-4">
      <Helmet>
        <title>{`${copy(policy.title)} ${copy("— Draft | ALMONA")}`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <article className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">{copy(policy.title)}</h1>
          <div role="note" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-100">{copy("Draft for review — not an approved or effective policy. Business and legal review is required before publication.")}</div>
        </header>
        {policy.sections.map(([title, content]) => (
          <section key={title} className="space-y-3">
            <h2 className="text-xl font-semibold text-white">{copy(title)}</h2>
            <p className="text-gray-300 leading-relaxed">{copy(content)}</p>
          </section>
        ))}
        <section className="rounded-lg border border-gray-700 p-5 space-y-3">
          <h2 className="text-xl font-semibold text-white">{copy("Before this draft is approved")}</h2>
          <p className="text-gray-300 leading-relaxed">{copy(policy.pending)}</p>
        </section>
        <nav className="flex gap-6 text-amber-400" aria-label={copy("Policy navigation")}>
          <Link to="/contact" className="underline">{copy("Contact ALMONA")}</Link>
          <Link to={kind === 'privacy' ? '/terms' : '/privacy'} className="underline">{copy(kind === 'privacy' ? 'Website Terms' : 'Privacy Notice')}</Link>
        </nav>
      </article>
    </main>
  );
}
