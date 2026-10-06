/**
 * Studio Operator Help — university-tier floor reference.
 * AICS-001: documentation only; no manufacturing execution.
 * Languages: EN / AR (formal workshop MSA) / TR (formal technician).
 */

import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { isRTL } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  CheckSquare,
  ClipboardList,
  Link2,
  Printer,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

type PrincipleItem = { title: string; body: string; result: string };
type PipelineStep = { label: string; gate: string | null };
type TroubleRow = { symptom: string; cause: string; action: string };

const SECTION_IDS = [
  'principles',
  'pipeline',
  'revision',
  'roles',
  'packs',
  'stock',
  'troubleshoot',
  'assessment',
] as const;

export const StudioOperatorHelpPage: React.FC = () => {
  const { t, i18n } = useTranslation('operator_help');
  const rtl = isRTL(i18n.language);

  const principles = useMemo(
    () => (t('principles.items', { returnObjects: true }) as PrincipleItem[]) || [],
    [t, i18n.language],
  );
  const steps = useMemo(
    () => (t('pipeline.steps', { returnObjects: true }) as PipelineStep[]) || [],
    [t, i18n.language],
  );
  const troubleRows = useMemo(
    () => (t('troubleshoot.rows', { returnObjects: true }) as TroubleRow[]) || [],
    [t, i18n.language],
  );
  const assessmentItems = useMemo(
    () => (t('assessment.items', { returnObjects: true }) as string[]) || [],
    [t, i18n.language],
  );

  return (
    <div
      className="h-full overflow-y-auto bg-[#0a0a0a] text-amber-100/90"
      dir={rtl ? 'rtl' : 'ltr'}
      data-testid="studio-operator-help"
      lang={i18n.language.startsWith('ar') ? 'ar' : i18n.language.startsWith('tr') ? 'tr' : 'en'}
    >
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 print:max-w-none print:px-2 print:py-2">
        <header className="border border-amber-700/40 bg-[#0f0f0f] p-4 sm:p-5 mb-6 print:border-black print:bg-white print:text-black">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-amber-600 print:text-neutral-600">
                ALMONA · Fabricator Pro
              </p>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-amber-100 print:text-black">
                {t('meta.title')}
              </h1>
              <p className="text-sm text-amber-200/70 max-w-2xl leading-relaxed print:text-neutral-700">
                {t('meta.subtitle')}
              </p>
              <p className="text-[11px] text-amber-700/90 print:text-neutral-600">
                {t('meta.audience')} · {t('meta.live_site')}:{' '}
                <a
                  href="https://www.almona02.com"
                  className="underline decoration-amber-700/50 underline-offset-2 hover:text-amber-300"
                  target="_blank"
                  rel="noreferrer"
                >
                  www.almona02.com
                </a>
              </p>
              <p className="text-[10px] font-mono text-amber-800 print:text-neutral-500">
                {t('meta.standards')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-amber-700">
                {t('meta.lang_label')}
              </span>
              <LanguageSwitcher variant="solid" className="!text-[11px]" />
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-600/40 px-3 py-1.5 text-[11px] text-amber-200 hover:bg-amber-500/10"
              >
                <Printer size={14} aria-hidden />
                {t('meta.print')}
              </button>
            </div>
          </div>

          <nav
            aria-label={t('meta.title')}
            className="mt-4 flex flex-wrap gap-2 border-t border-amber-900/50 pt-3 print:hidden"
          >
            {SECTION_IDS.map((id) => (
              <a
                key={id}
                href={`#help-${id}`}
                className="rounded border border-amber-800/50 px-2 py-1 text-[10px] uppercase tracking-wide text-amber-400/90 hover:border-amber-600 hover:text-amber-200"
              >
                {t(`toc.${id}`)}
              </a>
            ))}
          </nav>
        </header>

        <section id="help-principles" className="mb-8 scroll-mt-4">
          <SectionHeading>{t('principles.heading')}</SectionHeading>
          <p className="mb-4 text-sm text-amber-200/60 leading-relaxed print:text-neutral-700">
            {t('principles.intro')}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
            {Array.isArray(principles) &&
              principles.map((item, index) => (
                <article
                  key={item.title}
                  className="border border-amber-800/45 bg-[#0c0c0c] p-4 flex flex-col gap-2 print:border-neutral-400 print:bg-white"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[10px] text-amber-600 tabular-nums">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-sm font-semibold text-amber-100 print:text-black">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-xs text-amber-200/75 leading-relaxed flex-1 print:text-neutral-800">
                    {item.body}
                  </p>
                  <p className="text-[11px] border-t border-amber-900/40 pt-2 text-amber-500/90 print:border-neutral-300 print:text-neutral-600">
                    {item.result}
                  </p>
                </article>
              ))}
          </div>
        </section>

        <section id="help-pipeline" className="mb-8 scroll-mt-4">
          <SectionHeading>{t('pipeline.heading')}</SectionHeading>
          <p className="mb-4 text-sm text-amber-200/60 leading-relaxed print:text-neutral-700">
            {t('pipeline.intro')}
          </p>
          <ol className="space-y-0 border border-amber-800/40 print:border-neutral-400">
            {Array.isArray(steps) &&
              steps.map((step, index) => (
                <li
                  key={`${step.label}-${index}`}
                  className={cn(
                    'flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-3 py-2.5',
                    index % 2 === 0 ? 'bg-[#0c0c0c]' : 'bg-[#0a0a0a]',
                    'border-b border-amber-900/30 last:border-b-0 print:bg-white print:border-neutral-200',
                  )}
                >
                  <div className="flex items-center gap-2 sm:min-w-[11rem] shrink-0">
                    <span className="font-mono text-[10px] text-amber-700 tabular-nums w-5">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-medium text-amber-100 print:text-black">
                      {step.label}
                    </span>
                  </div>
                  {step.gate ? (
                    <p className="text-[11px] text-amber-600/95 leading-snug sm:pt-0.5 print:text-neutral-700">
                      <span className="font-mono uppercase tracking-wider text-amber-700/80 me-1.5">
                        {t('meta.gate_label')}
                      </span>
                      {step.gate}
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-800/80 sm:pt-0.5 print:text-neutral-500">—</p>
                  )}
                </li>
              ))}
          </ol>
        </section>

        <section id="help-revision" className="mb-8 scroll-mt-4">
          <SectionHeading>{t('revision.heading')}</SectionHeading>
          <div className="border border-amber-700/50 bg-amber-950/20 p-4 space-y-3 print:border-neutral-500 print:bg-neutral-50">
            <p className="font-mono text-[11px] text-amber-400 break-words print:text-neutral-800">
              {t('revision.identity')}
            </p>
            <p className="text-sm text-amber-100/85 leading-relaxed print:text-neutral-800">
              {t('revision.what')}
            </p>
            <p className="text-sm text-amber-100/85 leading-relaxed print:text-neutral-800">
              {t('revision.when')}
            </p>
            <div className="border border-amber-600/40 bg-[#0a0a0a] p-3 print:border-black print:bg-white">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1.5 print:text-black">
                {t('revision.rule_title')}
              </h3>
              <p className="text-xs text-amber-200/80 leading-relaxed print:text-neutral-800">
                {t('revision.rule_body')}
              </p>
            </div>
            <p className="text-[11px] text-amber-500 flex items-start gap-2 print:text-neutral-700">
              <CheckSquare size={14} className="mt-0.5 shrink-0" aria-hidden />
              <span>{t('revision.evidence')}</span>
            </p>
          </div>
        </section>

        <section id="help-roles" className="mb-8 scroll-mt-4">
          <SectionHeading>{t('roles.heading')}</SectionHeading>
          <div className="space-y-3 text-sm text-amber-200/75 leading-relaxed print:text-neutral-800">
            <p>{t('roles.register')}</p>
            <p>{t('roles.privileged')}</p>
            <div className="border border-amber-800/45 p-3 bg-[#0c0c0c] print:border-neutral-400 print:bg-white">
              <h3 className="text-xs font-semibold text-amber-300 mb-1 print:text-black">
                {t('roles.shared_title')}
              </h3>
              <p className="text-xs text-amber-200/70 print:text-neutral-800">
                {t('roles.shared_body')}
              </p>
            </div>
          </div>
        </section>

        <section id="help-packs" className="mb-8 scroll-mt-4">
          <SectionHeading>{t('packs.heading')}</SectionHeading>
          <ul className="space-y-2 text-sm text-amber-200/75 leading-relaxed print:text-neutral-800">
            <li>
              <Link
                to={fabricatorRoutes.studioData()}
                className="text-amber-400 underline-offset-2 hover:underline print:text-black"
              >
                {t('packs.gallery')}
              </Link>
            </li>
            <li>{t('packs.examples')}</li>
            <li>{t('packs.roles')}</li>
            <li>
              {t('packs.tuning')}{' '}
              <Link
                to={fabricatorRoutes.studioData('tuning-no-dxf')}
                className="text-amber-500 hover:underline print:text-neutral-700"
              >
                No-DXF
              </Link>
              {' · '}
              <Link
                to={fabricatorRoutes.studioData('tuning')}
                className="text-amber-500 hover:underline print:text-neutral-700"
              >
                DXF
              </Link>
            </li>
            <li className="border border-amber-800/40 p-3 text-xs text-amber-500/95 print:border-neutral-400 print:text-neutral-700">
              {t('packs.note')}
            </li>
          </ul>
        </section>

        <section id="help-stock" className="mb-8 scroll-mt-4">
          <SectionHeading>{t('stock.heading')}</SectionHeading>
          <ul className="space-y-2 text-sm text-amber-200/75 leading-relaxed print:text-neutral-800">
            <li>
              <Link
                to={fabricatorRoutes.studioDataStock()}
                className="text-amber-400 underline-offset-2 hover:underline print:text-black"
              >
                {t('stock.location')}
              </Link>
            </li>
            <li>{t('stock.wizard')}</li>
            <li>{t('stock.invoice')}</li>
            <li>{t('stock.soft')}</li>
            <li>{t('stock.add')}</li>
            <li className="text-xs text-amber-600 print:text-neutral-600">{t('stock.test')}</li>
          </ul>
        </section>

        <section id="help-troubleshoot" className="mb-8 scroll-mt-4">
          <SectionHeading>{t('troubleshoot.heading')}</SectionHeading>
          <div className="overflow-x-auto border border-amber-800/40 print:border-neutral-400">
            <table className="w-full text-xs min-w-[36rem]">
              <thead>
                <tr className="bg-amber-950/40 text-[10px] uppercase tracking-wider text-amber-600 print:bg-neutral-100 print:text-neutral-700">
                  <th className="text-start p-2.5 font-medium">{t('troubleshoot.cols.symptom')}</th>
                  <th className="text-start p-2.5 font-medium">{t('troubleshoot.cols.cause')}</th>
                  <th className="text-start p-2.5 font-medium">{t('troubleshoot.cols.action')}</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(troubleRows) &&
                  troubleRows.map((row) => (
                    <tr
                      key={row.symptom}
                      className="border-t border-amber-900/35 align-top print:border-neutral-200"
                    >
                      <td className="p-2.5 text-amber-100/90 print:text-black">{row.symptom}</td>
                      <td className="p-2.5 text-amber-200/65 print:text-neutral-800">{row.cause}</td>
                      <td className="p-2.5 text-amber-200/75 print:text-neutral-800">{row.action}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="help-assessment" className="mb-10 scroll-mt-4">
          <SectionHeading icon={<ClipboardList size={16} aria-hidden />}>
            {t('assessment.heading')}
          </SectionHeading>
          <p className="mb-2 text-sm text-amber-200/60 print:text-neutral-700">
            {t('assessment.intro')}
          </p>
          <p className="mb-4 text-[11px] font-medium text-amber-400 flex items-start gap-2 print:text-neutral-800">
            <CheckSquare size={14} className="mt-0.5 shrink-0" aria-hidden />
            {t('assessment.mandatory_chrome')}
          </p>
          <ul className="space-y-2 border border-amber-800/40 p-3 sm:p-4 print:border-neutral-400">
            {Array.isArray(assessmentItems) &&
              assessmentItems.map((item) => (
                <li
                  key={item}
                  className="flex gap-2.5 text-xs text-amber-200/80 leading-snug print:text-neutral-800"
                >
                  <span
                    className="mt-0.5 inline-block h-3.5 w-3.5 shrink-0 border border-amber-600/50 print:border-neutral-500"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
          </ul>
        </section>

        <footer className="border-t border-amber-900/40 pt-4 pb-8 space-y-2 text-[11px] text-amber-700 print:border-neutral-300 print:text-neutral-600">
          <div className="flex items-center gap-2">
            <BookOpen size={14} aria-hidden />
            <span>{t('meta.full_guide')}</span>
          </div>
          <p className="font-mono text-amber-600/90 break-all print:text-neutral-600">
            {t('meta.guide_path')}
          </p>
          <Link
            to={fabricatorRoutes.studioCommand()}
            className="inline-flex items-center gap-1.5 text-amber-500 hover:text-amber-300 print:hidden"
          >
            <Link2 size={12} aria-hidden />
            {fabricatorRoutes.studioCommand()}
          </Link>
        </footer>
      </div>
    </div>
  );
};

function SectionHeading({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-amber-400 border-b border-amber-800/40 pb-2 print:text-black print:border-neutral-400">
      {icon}
      {children}
    </h2>
  );
}

export default StudioOperatorHelpPage;
